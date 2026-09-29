import { Events } from "discord.js";
import Event from "../classes/Event";
import { RegisterCommands } from "@/classes/Command";

export default new Event({
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    client.logger.info(`Logged in as ${client.user?.username ?? "unknown"}`);

    await RegisterCommands(client);
  },
});
