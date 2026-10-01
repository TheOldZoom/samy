import { Events } from "discord.js";

import Event from "@/classes/Event";
import { loadAfkStatuses } from "@/utils/afk";

export default new Event({
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const statuses = await loadAfkStatuses();
    client.logger.info({ statuses }, "AFK statuses loaded");
  },
});
