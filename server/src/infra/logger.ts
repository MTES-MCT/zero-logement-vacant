import {
  createLogger as createBaseLogger,
  Logger
} from '@zerologementvacant/utils';
import config from './config';

export const logger = createBaseLogger('server', {
  isProduction: config.app.env === 'production',
  level: config.log.level
});

export function createLogger(name: string): Logger {
  return createBaseLogger(name, {
    isProduction: config.app.env === 'production',
    level: config.log.level
  });
}
