import { Client as DiscordClient, GatewayIntentBits } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import type { APIUser } from "@discordjs/core";
import Logger from "./Logger";
import { LoadEvents } from "./Event";
import type Command from "./Command";
import { LoadCommands } from "./Command";

const token = process.env.DISCORD_TOKEN!;

export default class Client extends DiscordClient {
  readonly logger = new Logger();
  private readonly ws: WebSocketManager;
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
}
