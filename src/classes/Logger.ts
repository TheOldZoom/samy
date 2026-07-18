import pino from "pino";

type LogData = object | undefined;

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

  private parseArgs(
    arg1: string | LogData,
    arg2?: string | LogData,
  ): [LogData, string?] {
    if (typeof arg1 === "string") {
      return [arg2 as LogData, arg1];
    }

    return [arg1, arg2 as string | undefined];
  }

  info(arg1: string | LogData, arg2?: string | LogData) {
    const [data, message] = this.parseArgs(arg1, arg2);
    this.logger.info(data, message);
  }

  warn(arg1: string | LogData, arg2?: string | LogData) {
    const [data, message] = this.parseArgs(arg1, arg2);
    this.logger.warn(data, message);
  }

  error(arg1: string | LogData, arg2?: string | LogData) {
    const [data, message] = this.parseArgs(arg1, arg2);
    this.logger.error(data, message);
  }

  debug(arg1: string | LogData, arg2?: string | LogData) {
    const [data, message] = this.parseArgs(arg1, arg2);
    this.logger.debug(data, message);
  }

  fatal(arg1: string | LogData, arg2?: string | LogData) {
    const [data, message] = this.parseArgs(arg1, arg2);
    this.logger.fatal(data, message);
  }
}
