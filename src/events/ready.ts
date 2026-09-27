import { GatewayDispatchEvents } from "@discordjs/core";
import Event from "../classes/Event";

export default new Event({
  name: GatewayDispatchEvents.Ready,
  once: true,
  execute: (client, { data }) => {
    client.user = data.user;
    client.logger.info(`Logged in as ${client.user.username}`);
  },
});
