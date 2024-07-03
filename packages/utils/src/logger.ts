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

export function createLogger(name: string, opts: LoggerOptions): Logger {
  const level = opts.level ?? LogLevel.DEBUG;
  const developmentOptions: PinoLoggerOptions = {
    transport: {
      target: 'pino-pretty'
    }
  };
  const logger = pino({
    ...(opts.isProduction ? {} : developmentOptions),
    name,
    level
  });

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
