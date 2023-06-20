import { createLogger } from '../../shared/utils/logger';
import config from './config';

export const logger = createLogger('server', {
  isProduction: config.environment === 'production',
  level: config.log.level,
});
