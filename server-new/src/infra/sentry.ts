import * as Sentry from '@sentry/node';
import { Express } from 'express';

import config from '../config';
import { logger } from './logger';

function init(app: Express): void {
  if (config.sentry.enabled && !config.sentry.dsn) {
    throw new Error('Sentry must be initialized with a valid DSN');
  }

  if (config.sentry.enabled && config.sentry.dsn) {
    logger.info('Init sentry', {
      level: 'error',
      dsn: config.sentry.dsn,
    });

    Sentry.init({
      dsn: config.sentry.dsn,
      environment:
        config.app.env === 'production' ? 'production' : 'development',
      tracesSampleRate: 1.0,
      integrations: [
        new Sentry.Integrations.Http({
          tracing: true,
        }),
        new Sentry.Integrations.Express({
          app,
        }),
        new Sentry.Integrations.Postgres(),
      ],
    });

    // RequestHandler creates a separate execution context using domains, so that every
    // transaction/span/breadcrumb is attached to its own Hub instance
    app.use(Sentry.Handlers.requestHandler());

    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());
  }
}

/**
 * The error handler must be before any other error middleware and after all controllers.
 * @param app
 */
function errorHandler(app: Express): void {
  if (config.sentry.enabled && config.sentry.dsn) {
    app.use(Sentry.Handlers.errorHandler());
  }
}

export default {
  init,
  errorHandler,
};
