import { createLogger } from '@zerologementvacant/utils';
import config from './config';

export const logger = createLogger('server', {
  isProduction: config.app.env === 'production',
  level: config.log.level,
});
