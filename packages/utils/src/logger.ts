import pino, { LoggerOptions as PinoLoggerOptions } from 'pino';
import { LogLevel } from './log-level';

interface LoggerOptions {
  isProduction?: boolean;
  level?: LogLevel;
}

interface LogFn {
  (message: string, data?: unknown): void;
  (obj: object): void;
  (obj: unknown): void;
}

export interface Logger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

let baseLogger: ReturnType<typeof pino>;

export function createLogger(name: string, opts: LoggerOptions): Logger {
  const level = opts.level ?? LogLevel.DEBUG;
  const developmentOptions: PinoLoggerOptions = {
    transport: {
      target: 'pino-pretty'
    }
  };
  // Late init the parent logger
  baseLogger =
    baseLogger ??
    pino({
      ...(opts.isProduction ? {} : developmentOptions),
      level: LogLevel.DEBUG
    });

  // Provide a child logger to avoid overhead
  const logger = baseLogger.child({ name }, { level });
  return {
    trace: toPinoLogFn(logger.trace.bind(logger)),
    debug: toPinoLogFn(logger.debug.bind(logger)),
    info: toPinoLogFn(logger.info.bind(logger)),
    warn: toPinoLogFn(logger.warn.bind(logger)),
    error: toPinoLogFn(logger.error.bind(logger))
  };
}

function toPinoLogFn(log: pino.LogFn): LogFn {
  return (messageOrData: string | object | unknown, data?: unknown) => {
    if (typeof messageOrData === 'string') {
      log(data, messageOrData);
    } else {
      log(messageOrData);
    }
  };
}
