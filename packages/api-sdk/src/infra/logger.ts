import { createLogger } from '@zerologementvacant/utils';
import config, { isProduction } from './config';

export const logger = createLogger('api-sdk', {
  level: config.log.level,
  isProduction,
});
