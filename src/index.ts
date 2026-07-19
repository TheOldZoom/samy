import { ShardingManager } from "discord.js";
import Logger from "@/classes/Logger";
import { CheckEnvs } from "@/utils/env";

CheckEnvs(["DISCORD_TOKEN"]);

const manager = new ShardingManager("./src/bot.ts", {
  token: process.env.DISCORD_TOKEN,
});

manager.on("shardCreate", (shard) => {
  new Logger().info(`Launched shard ${shard.id}`);
});

manager.spawn();

process.on("unhandledRejection", (reason) => {
  new Logger().error("Unhandled Rejection", reason as any);
});

process.on("uncaughtException", (error) => {
  new Logger().error("Uncaught Exception", error);
});

process.on("SIGINT", () => {
  new Logger().info("Stopping ShardingManager...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  new Logger().info("Stopping ShardingManager...");
  process.exit(0);
});
