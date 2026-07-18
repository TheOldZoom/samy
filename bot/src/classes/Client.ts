import * as Discord from "discord.js";
import { CheckEnvs } from "../utils/env";
import { LoadEvents } from "./Event";
import Logger from "./Logger";
import {
  LoadCommands,
  type MessageCommand,
  type SlashCommand,
} from "./Command";

export default class Client extends Discord.Client {
  public slashCommands = new Discord.Collection<string, SlashCommand>();
  public messageCommands = new Discord.Collection<string, MessageCommand>();

  constructor(public readonly logger = new Logger()) {
    super({
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
      ],
    });
  }

  async connect() {
    CheckEnvs(["NODE_ENV", "DATABASE_URL", "DISCORD_TOKEN"]);

    await LoadEvents(this);

    await LoadCommands(this, "../commands/slash", this.slashCommands);

    await LoadCommands(this, "../commands/message", this.messageCommands);

    await this.login(process.env.DISCORD_TOKEN);
  }
}
