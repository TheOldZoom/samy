import { ShardingManager } from "discord.js";
import Logger from "./classes/Logger";
import { CheckEnvs } from "./utils/env";

CheckEnvs(["DISCORD_TOKEN"]);

const manager = new ShardingManager("./src/bot.ts", {
  token: process.env.DISCORD_TOKEN,
});

manager.on("shardCreate", (shard) => {
  new Logger().info(`Launched shard ${shard.id}`);
});

manager.spawn();
