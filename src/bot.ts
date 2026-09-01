import Client from "@/classes/client";
import Logger from "@/classes/Logger";
import { CheckEnvs } from "@/utils/env";

CheckEnvs(["DISCORD_TOKEN"]);

const logger = new Logger();
const client = new Client(logger);

void client.connect();

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down...`);

  await client.destroy();

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
