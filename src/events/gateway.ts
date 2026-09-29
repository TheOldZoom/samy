import { Events } from "discord.js";
import Event from "@/classes/Event";

export default new Event({
  name: Events.ShardResume,
  execute: async (client, shardId) => {
    client.logger.info(`Gateway shard ${shardId} resumed`);
  },
});
