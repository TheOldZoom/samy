import Client from "./classes/Client";

const client = new Client();

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;

  shuttingDown = true;

  client.logger.info(`Received ${signal}`);

  const timeout = setTimeout(() => {
    client.logger.error("Shutdown timed out");
    process.exit(1);
  }, 120_000);
  timeout.unref();

  try {
    await client.destroy();

    clearTimeout(timeout);

    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);

    client.logger.error({ err: error }, "Error during shutdown");

    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

await client.login();
