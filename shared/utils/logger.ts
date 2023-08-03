import { Logger } from 'tslog';
import { LOG_LEVELS, LogLevel } from './log-level';

interface LoggerOptions {
  isProduction?: boolean;
  level?: LogLevel;
}

export function createLogger(name: string, opts: LoggerOptions) {
  const level = LOG_LEVELS.indexOf(opts.level ?? LogLevel.DEBUG);
  return new Logger({
    name: 'logger',
    type: 'pretty',
    hideLogPositionForProduction: !!opts.isProduction,
    minLevel: level,
  });
}
