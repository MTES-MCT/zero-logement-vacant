import pino, { LoggerOptions as PinoLoggerOptions } from 'pino';

import { LogLevel } from './log-level';
import { redactSensitiveData, redactSensitiveUrl } from './redaction';

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
    trace: toPinoLogFn(logger.trace.bind(logger), () =>
      logger.isLevelEnabled(LogLevel.TRACE)
    ),
    debug: toPinoLogFn(logger.debug.bind(logger), () =>
      logger.isLevelEnabled(LogLevel.DEBUG)
    ),
    info: toPinoLogFn(logger.info.bind(logger), () =>
      logger.isLevelEnabled(LogLevel.INFO)
    ),
    warn: toPinoLogFn(logger.warn.bind(logger), () =>
      logger.isLevelEnabled(LogLevel.WARN)
    ),
    error: toPinoLogFn(logger.error.bind(logger), () =>
      logger.isLevelEnabled(LogLevel.ERROR)
    )
  };
}

function toPinoLogFn(log: pino.LogFn, isEnabled: () => boolean): LogFn {
  return (messageOrData: string | object | unknown, data?: unknown) => {
    if (!isEnabled()) {
      return;
    }
    if (typeof messageOrData === 'string') {
      log(redactLogData(data), redactSensitiveUrl(messageOrData));
    } else {
      log(redactLogData(messageOrData));
    }
  };
}

function redactLogData(value: unknown): unknown {
  return redactSensitiveData(value, { transformError: redactError });
}

function redactError(error: Error): Record<string, unknown> {
  const code = (error as Error & { code?: unknown }).code;
  return {
    name: error.name,
    code:
      typeof code === 'string' && /^[a-z0-9_.:-]{1,64}$/i.test(code)
        ? code
        : undefined,
    stack:
      error.stack
        ?.split('\n')
        .filter((line) => /^\s+at\s/.test(line))
        .join('\n') || undefined
  };
}
