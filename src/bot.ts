import Client from "@/classes/Client";

const client = new Client();

client.connect();

export function shutdown(signal: string) {
  client.logger.info(`${signal} received, shutting the shard down`);
  client.destroy();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
