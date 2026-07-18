import pino from "pino";

export default class Logger {
  private logger = pino({
    level: process.env.LOG_LEVEL ?? "info",

    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  });

  info(message: string, data?: object) {
    this.logger.info(data, message);
  }

  warn(message: string, data?: object) {
    this.logger.warn(data, message);
  }

  error(message: string, data?: object) {
    this.logger.error(data, message);
  }

  debug(message: string, data?: object) {
    this.logger.debug(data, message);
  }

  fatal(message: string, data?: object) {
    this.logger.fatal(data, message);
  }
}
