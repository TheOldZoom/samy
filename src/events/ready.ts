import { Events } from "discord.js";
import Event from "../classes/Event";
import { RegisterCommands } from "@/classes/Command";

export default new Event({
  name: Events.ClientReady,
  once: true,
  execute: async (client) => {
    client.logger.info(`Logged in as ${client.user?.username ?? "unknown"}`);
    client.logger.debug(
      {
        userId: client.user?.id,
        guilds: client.guilds.cache.size,
        shards: client.ws.shards.size,
        commands: client.commands.size,
        contextCommands: client.contextCommands.size,
        handlers: {
          buttons: client.interactionHandlers.buttons.size,
          selects: client.interactionHandlers.selects.size,
          modals: client.interactionHandlers.modals.size,
        },
      },
      "Discord client ready",
    );

    await RegisterCommands(client);
  },
});
