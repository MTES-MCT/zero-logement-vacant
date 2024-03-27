import { createLogger as logger } from '../../shared';
import config, { isProduction } from './config';

export function createLogger(name: string) {
  return logger(name, {
    level: config.log.level,
    isProduction,
  });
}
