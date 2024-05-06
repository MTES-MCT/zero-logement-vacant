import { createLogger as logger } from '@zerologementvacant/utils';
import config, { isProduction } from './config';

export function createLogger(name: string) {
  return logger(name, {
    level: config.log.level,
    isProduction,
  });
}
