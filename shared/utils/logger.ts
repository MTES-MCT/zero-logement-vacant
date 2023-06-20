import { Logger } from 'tslog';
import { LogLevel } from './log-level';

interface LoggerOptions {
  isProduction?: boolean;
  level?: LogLevel;
}

export function createLogger(name: string, opts: LoggerOptions) {
  return new Logger({
    name: 'logger',
    type: 'pretty',
    hideLogPositionForProduction: !!opts.isProduction,
    minLevel: opts.level ?? LogLevel.DEBUG,
  });
}
