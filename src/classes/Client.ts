import { Client as DiscordClient, GatewayIntentBits, Routes } from "discord.js";

import Logger from "./Logger";
import { LoadEvents } from "./Event";
import type Command from "./Command";
import type { ContextCommand } from "./Command";
import { LoadCommands } from "./Command";
import InteractionHandler, {
  LoadInteractionHandlers,
} from "@/interaction/Handler";

import prisma from "@/libs/Prisma";

const token = process.env.DISCORD_TOKEN!;

const PING_TARGETS = ["ws", "rest", "db"] as const;

export type PingTarget = (typeof PING_TARGETS)[number];

interface PingResult {
  ws: number | null;
  rest: number;
  db: number | null;
}

export default class Client extends DiscordClient {
  readonly logger = new Logger();

  private shuttingDown = false;
  private activeInteractions = 0;
  private resolveShutdown?: () => void;

  private readonly cooldowns = new Map<string, number>();

  commands = new Map<string, Command>();
  contextCommands = new Map<string, ContextCommand>();

  interactionHandlers: {
    buttons: Map<string, InteractionHandler>;
    selects: Map<string, InteractionHandler>;
    modals: Map<string, InteractionHandler>;
  } = {
    buttons: new Map(),
    selects: new Map(),
    modals: new Map(),
  };

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
      ],
    });
  }

  override async login() {
    const startedAt = performance.now();
    this.logger.debug(
      {
        runtime: `Bun ${Bun.version}`,
        environment: process.env.NODE_ENV ?? "development",
        logLevel: process.env.LOG_LEVEL ?? "info",
        intents: this.options.intents,
      },
      "Starting bot client",
    );

    if (!token) {
      throw new Error("DISCORD_TOKEN is not configured");
    }

    let stageStartedAt = performance.now();
    await LoadEvents(this);
    this.logger.debug(
      { durationMs: Math.round(performance.now() - stageStartedAt) },
      "Events initialized",
    );

    stageStartedAt = performance.now();
    await LoadCommands(this);
    this.logger.debug(
      {
        commands: this.commands.size,
        contextCommands: this.contextCommands.size,
        durationMs: Math.round(performance.now() - stageStartedAt),
      },
      "Commands initialized",
    );

    stageStartedAt = performance.now();
    await LoadInteractionHandlers(this, "buttons");
    await LoadInteractionHandlers(this, "selects");
    await LoadInteractionHandlers(this, "modals");
    this.logger.debug(
      {
        buttons: this.interactionHandlers.buttons.size,
        selects: this.interactionHandlers.selects.size,
        modals: this.interactionHandlers.modals.size,
        durationMs: Math.round(performance.now() - stageStartedAt),
      },
      "Interaction framework initialized",
    );

    this.logger.debug(
      { durationMs: Math.round(performance.now() - startedAt) },
      "Connecting to Discord gateway",
    );

    return super.login(token);
  }

  async getShardId(guildId: string): Promise<number> {
    const shardCount = this.ws.shards.size || 1;

    return Number((BigInt(guildId) >> 22n) % BigInt(shardCount));
  }

  async ping<T extends PingTarget>(
    guildId: string | null | undefined,
    ...targets: T[]
  ): Promise<Pick<PingResult, T>> {
    const wanted = new Set<PingTarget>(targets.length ? targets : PING_TARGETS);

    const result: Partial<PingResult> = {};
    const tasks: Promise<void>[] = [];

    if (wanted.has("ws")) {
      const shardId = guildId ? await this.getShardId(guildId) : null;

      result.ws =
        shardId === null ? null : (this.ws.shards.get(shardId)?.ping ?? null);
    }

    if (wanted.has("rest")) {
      tasks.push(
        (async () => {
          const start = performance.now();

          await this.rest.get(Routes.gateway());

          result.rest = Math.round(performance.now() - start);
        })(),
      );
    }

    if (wanted.has("db")) {
      tasks.push(
        (async () => {
          const start = performance.now();

          try {
            await prisma.$queryRaw`SELECT 1`;

            result.db = Math.round(performance.now() - start);
          } catch {
            result.db = null;
          }
        })(),
      );
    }

    await Promise.all(tasks);

    return result as Pick<PingResult, T>;
  }

  useCooldown(key: string, userId: string, seconds: number): number | null {
    const id = `${key}:${userId}`;
    const now = Date.now();
    const active = this.cooldowns.get(id);

    if (active && active > now) {
      return active;
    }

    const expires = now + seconds * 1000;

    this.cooldowns.set(id, expires);

    setTimeout(() => {
      if (this.cooldowns.get(id) === expires) {
        this.cooldowns.delete(id);
      }
    }, seconds * 1000);

    return null;
  }

  startInteraction() {
    if (this.shuttingDown) {
      this.logger.debug("Rejected interaction during shutdown");
      return false;
    }

    this.activeInteractions++;

    this.logger.debug(
      { activeInteractions: this.activeInteractions },
      "Interaction started",
    );

    return true;
  }

  finishInteraction() {
    this.activeInteractions--;

    this.logger.debug(
      { activeInteractions: this.activeInteractions },
      "Interaction finished",
    );

    if (this.shuttingDown && this.activeInteractions === 0) {
      this.resolveShutdown?.();
    }
  }

  override async destroy() {
    const startedAt = performance.now();
    this.shuttingDown = true;

    this.logger.info(
      `Shutting down, waiting for ${this.activeInteractions} active interaction(s)...`,
    );

    if (this.activeInteractions > 0) {
      await new Promise<void>((resolve) => {
        this.resolveShutdown = resolve;
      });
    }

    this.logger.info("All interactions finished");

    const discordStartedAt = performance.now();
    await super.destroy();
    this.logger.debug(
      { durationMs: Math.round(performance.now() - discordStartedAt) },
      "Discord client destroyed",
    );

    const databaseStartedAt = performance.now();
    await prisma.$disconnect();
    this.logger.debug(
      { durationMs: Math.round(performance.now() - databaseStartedAt) },
      "Database disconnected",
    );

    this.logger.info(
      { durationMs: Math.round(performance.now() - startedAt) },
      "Shutdown complete",
    );
  }
}
