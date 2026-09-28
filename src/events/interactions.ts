import { GatewayDispatchEvents } from "@discordjs/core";

import Event from "@/classes/Event";
import { routeInteraction } from "@/interaction/Router";

export default new Event({
  name: GatewayDispatchEvents.InteractionCreate,

  execute: async (client, { data: raw, api }) => {
    await routeInteraction(client, api, raw);
  },
});
