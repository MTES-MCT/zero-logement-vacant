import * as Sentry from '@sentry/node';
import { Express } from 'express';
import config from './config';

const init = (app: Express): void => {
  if (config.sentry.enabled && config.sentry.dsn) {
    const logLevel = ['error'];

    console.log(
      `Initializing Sentry for log level "${logLevel}" and config: ${config.sentry.dsn}`
    );

    Sentry.init({
      dsn: config.sentry.dsn,
      environment: 'development',
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
};

/**
 * The error handler must be before any other error middleware and after all controllers.
 * @param app
 */
const errorHandler = (app: Express): void => {
  if (config.sentry.enabled && config.sentry.dsn) {
    app.use(Sentry.Handlers.errorHandler());
  }
};

export default {
  init,
  errorHandler,
};
