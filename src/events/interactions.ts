import { Events } from "discord.js";

import Event from "@/classes/Event";
import { routeInteraction } from "@/interaction/Router";

export default new Event({
  name: Events.InteractionCreate,

  execute: async (client, interaction) => {
    await routeInteraction(client, interaction);
  },
});
