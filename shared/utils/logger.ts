import pino from 'pino';
import { LogLevel } from './log-level';

interface LoggerOptions {
  isProduction?: boolean;
  level?: LogLevel;
}

export function createLogger(name: string, opts: LoggerOptions) {
  const level = opts.level ?? LogLevel.DEBUG;
  return pino({
    transport: {
      target: 'pino-pretty',
    },
    name,
    level,
  });
}
