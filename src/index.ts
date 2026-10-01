import Client from "./classes/Client";

const client = new Client();

client.logger.debug(
  {
    pid: process.pid,
    cwd: process.cwd(),
    environment: process.env.NODE_ENV ?? "development",
    logLevel: process.env.LOG_LEVEL ?? "info",
  },
  "Process initialized",
);

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;

  shuttingDown = true;
  const startedAt = performance.now();

  client.logger.info({ signal }, "Shutdown requested");

  const timeout = setTimeout(() => {
    client.logger.error("Shutdown timed out");
    process.exit(1);
  }, 120_000);
  timeout.unref();

  try {
    await client.destroy();

    clearTimeout(timeout);

    client.logger.debug(
      { signal, durationMs: Math.round(performance.now() - startedAt) },
      "Graceful shutdown finished",
    );

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

process.on("unhandledRejection", (error) => {
  client.logger.error({ err: error }, "Unhandled promise rejection");
});

process.on("uncaughtExceptionMonitor", (error, origin) => {
  client.logger.fatal({ err: error, origin }, "Uncaught exception");
});

try {
  await client.login();
} catch (error) {
  client.logger.fatal({ err: error }, "Bot startup failed");
  process.exitCode = 1;
}
