import * as Sentry from '@sentry/node';
import config from './config';
import { createLogger } from './logger';

function init(): void {
  if (config.sentry.enabled && !config.sentry.dsn) {
    throw new Error('Sentry must be initialized with a valid DSN');
  }

  const logger = createLogger('queue');

  if (config.sentry.enabled && config.sentry.dsn) {
    logger.info('Init sentry', {
      level: 'error',
      dsn: config.sentry.dsn,
      service: 'queue'
    });
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.app.env === 'production' ? 'production' : 'development',
      tracesSampleRate: 0.2,
      initialScope: {
        tags: {
          service: 'queue'
        }
      }
    });
  }
}

export default {
  init,
  addBreadcrumb: Sentry.addBreadcrumb,
  captureException: Sentry.captureException,
  captureMessage: Sentry.captureMessage,
  setUser: Sentry.setUser,
  setTag: Sentry.setTag
};