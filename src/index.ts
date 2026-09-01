import * as Discord from "discord.js";
import { CheckEnvs } from "@/utils/env";
import Logger from "@/classes/Logger";
import API from "./classes/API";
import { acquireLock, releaseLock } from "@/libs/lock";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

CheckEnvs(["DISCORD_TOKEN"]);

const logger = new Logger();
const __dirname = dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === "development";

let locked = false;

async function main() {
  if (isDev) {
    await import(join(__dirname, "bot.ts"));
    return;
  }

  const manager = new Discord.ShardingManager(join(__dirname, "bot.ts"), {
    token: process.env.DISCORD_TOKEN,
    totalShards: process.env.TOTAL_SHARDS
      ? Number(process.env.TOTAL_SHARDS)
      : "auto",
    mode: "process",
    respawn: true,
  });

  manager.on("shardCreate", (shard) => {
    logger.info(`Launched shard ${shard.id}`);
    shard.on("ready", () => logger.info(`Shard ${shard.id} is ready`));
    shard.on("death", () => logger.warn(`Shard ${shard.id} died`));
  });

  logger.info("Waiting for shard lock...");
  await acquireLock(logger);
  locked = true;
  logger.info("Lock acquired, spawning shards");

  const api = new API(manager, logger);
  api.start(Number(process.env.PORT ?? 4000));

  await manager.spawn({ timeout: -1 });

  process.on("SIGINT", () => void shutdown("SIGINT", manager));
  process.on("SIGTERM", () => void shutdown("SIGTERM", manager));
}

main().catch((err: unknown) => {
  logger.error(`Failed to start: ${err instanceof Error ? err.stack : String(err)}`);
  process.exit(1);
});

async function shutdown(signal: string, manager: Discord.ShardingManager) {
  logger.info(`${signal} received, shutting down...`);
  manager.shards.forEach((shard) => shard.kill());
  if (locked) await releaseLock();
  process.exit(0);
}

if (isDev) {
  process.on("SIGINT", () => {
    logger.info("SIGINT received, shutting down...");
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down...");
    process.exit(0);
  });
}
