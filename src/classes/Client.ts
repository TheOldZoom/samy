import { Client as DiscordClient, GatewayIntentBits } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
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

export default class Client extends DiscordClient {
  readonly logger = new Logger();
  private readonly ws: WebSocketManager;

  private shuttingDown = false;
  private activeInteractions = 0;
  private resolveShutdown?: () => void;

  private readonly cooldowns = new Map<string, number>();

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

  private setupGateway() {
    this.ws.on("error", (error) => {
      this.logger.error({ err: error }, "Gateway error");
    });

    this.ws.on("shardDisconnect", ({ code, reason, shardId }) => {
      this.logger.warn(
        `Gateway disconnected (shard ${shardId}, code ${code}, reason: ${reason})`,
      );
    });

    this.ws.on("shardReady", ({ shardId }) => {
      this.logger.info(`Gateway shard ${shardId} ready`);
    });

    this.ws.on("shardResume", ({ shardId }) => {
      this.logger.info(`Gateway shard ${shardId} resumed`);
    });
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
