import Client from "@/classes/client";
import Logger from "@/classes/Logger";
import { CheckEnvs } from "@/utils/env";
import { flushDirtyChains } from "@/utils/markov";

CheckEnvs(["DISCORD_TOKEN"]);

const logger = new Logger();
const client = new Client(logger);

void client.connect();

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down...`);

  try {
    await flushDirtyChains(client);
  } catch (error) {
    logger.error("Failed to flush Markov chains on shutdown", { error });
  }

  await client.destroy();

  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
