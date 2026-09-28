import {
  Client as DiscordClient,
  GatewayIntentBits,
  Routes,
} from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager, WebSocketShardEvents } from "@discordjs/ws";
import type { APIUser } from "@discordjs/core";

import Logger from "./Logger";
import { LoadEvents } from "./Event";
import type Command from "./Command";
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
  private readonly ws: WebSocketManager;

  private shuttingDown = false;
  private activeInteractions = 0;
  private resolveShutdown?: () => void;

  private readonly cooldowns = new Map<string, number>();
  private readonly shardLatencies = new Map<number, number>();

  user: APIUser | null = null;

  commands = new Map<string, Command>();

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
    const rest = new REST({ version: "10" }).setToken(token);

    const gateway = new WebSocketManager({
      token,
      intents: GatewayIntentBits.Guilds,
      rest,
    });

    super({ gateway, rest });

    this.ws = gateway;

    this.setupGateway();
  }

  async login() {
    await LoadEvents(this);
    await LoadCommands(this);

    await LoadInteractionHandlers(this, "buttons");
    await LoadInteractionHandlers(this, "selects");
    await LoadInteractionHandlers(this, "modals");

    await this.ws.connect();
  }

  async getShardId(guildId: string): Promise<number> {
    const shardCount = (await this.ws.getShardIds()).length;

    return Number((BigInt(guildId) >> 22n) % BigInt(shardCount));
  }

  private setupGateway() {
    this.ws.on(WebSocketShardEvents.Error, (error, shardId) => {
      this.logger.error({ err: error }, `Gateway error (shard ${shardId})`);
    });

    this.ws.on(WebSocketShardEvents.Closed, (code, shardId) => {
      this.shardLatencies.delete(shardId);

      this.logger.warn(`Gateway disconnected (shard ${shardId}, code ${code})`);
    });

    this.ws.on(WebSocketShardEvents.Ready, (_data, shardId) => {
      this.logger.info(`Gateway shard ${shardId} ready`);
    });

    this.ws.on(WebSocketShardEvents.Resumed, (shardId) => {
      this.logger.info(`Gateway shard ${shardId} resumed`);
    });

    this.ws.on(
      WebSocketShardEvents.HeartbeatComplete,
      ({ latency }, shardId) => {
        this.shardLatencies.set(shardId, latency);
      },
    );
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
        shardId === null ? null : (this.shardLatencies.get(shardId) ?? null);
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
      return false;
    }

    this.activeInteractions++;

    return true;
  }

  finishInteraction() {
    this.activeInteractions--;

    if (this.shuttingDown && this.activeInteractions === 0) {
      this.resolveShutdown?.();
    }
  }

  async destroy() {
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

    this.ws.destroy();

    await prisma.$disconnect();

    this.logger.info("Shutdown complete");
  }
}
