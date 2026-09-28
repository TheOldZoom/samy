import { GatewayDispatchEvents } from "@discordjs/core";
import Event from "@/classes/Event";

export default new Event({
  name: GatewayDispatchEvents.Resumed,
  execute: async (client) => {
    client.logger.info("Gateway connection resumed");
  },
});
