import * as Discord from "discord.js";
import { CheckEnvs } from "../utils/env";
import { LoadEvents } from "./Event";
import Logger from "./Logger";

export default class Client extends Discord.Client {
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

    await this.login(process.env.DISCORD_TOKEN);
  }
}
