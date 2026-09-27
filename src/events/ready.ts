import { GatewayDispatchEvents } from "@discordjs/core";
import Event from "../classes/Event";
import { RegisterCommands } from "@/classes/Command";

export default new Event({
  name: GatewayDispatchEvents.Ready,
  once: true,
  execute: async (client, { data }) => {
    client.user = data.user;
    client.logger.info(`Logged in as ${client.user.username}`);

    await RegisterCommands(client);
  },
});
