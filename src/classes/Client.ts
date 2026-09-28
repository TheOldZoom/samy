import { Client as DiscordClient, GatewayIntentBits } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import type { APIUser } from "@discordjs/core";
import Logger from "./Logger";
import { LoadEvents } from "./Event";
import type Command from "./Command";
import { LoadCommands } from "./Command";
import prisma from "@/libs/Prisma";

const token = process.env.DISCORD_TOKEN!;

export default class Client extends DiscordClient {
  readonly logger = new Logger();
  private readonly ws: WebSocketManager;

  private shuttingDown = false;
  private activeCommands = 0;
  private resolveShutdown?: () => void;

  user: APIUser | null = null;
  commands = new Map<string, Command>();

  constructor() {
    const rest = new REST({ version: "10" }).setToken(token);

    const gateway = new WebSocketManager({
      token,
      intents: GatewayIntentBits.Guilds,
      rest,
    });

    super({ gateway, rest });

    this.ws = gateway;
  }

  async login() {
    await LoadEvents(this);
    await LoadCommands(this);
    await this.ws.connect();
  }

  startCommand() {
    if (this.shuttingDown) return false;

    this.activeCommands++;
    return true;
  }

  finishCommand() {
    this.activeCommands--;

    if (this.shuttingDown && this.activeCommands === 0) {
      this.resolveShutdown?.();
    }
  }

  async destroy() {
    this.shuttingDown = true;

    this.logger.info(
      `Shutting down, waiting for ${this.activeCommands} active command(s)...`,
    );

    if (this.activeCommands > 0) {
      await new Promise<void>((resolve) => {
        this.resolveShutdown = resolve;
      });
    }

    this.logger.info("All commands finished");

    this.ws.destroy();

    await prisma.$disconnect();

    this.logger.info("Shutdown complete");
  }
}
