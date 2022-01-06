import * as Sentry from '@sentry/node';
import { Express } from 'express';
import config from './config';
import * as sentryIntegrations from '@sentry/integrations';

const initCaptureConsole = (): void => {

  const logLevel = ['error'];

  console.log(`Initializing Sentry for log level "${logLevel}" and config: ${config.sentryDNS}`);

  Sentry.init({
    dsn: config.sentryDNS,
    integrations: [
      new sentryIntegrations.CaptureConsole({ levels: logLevel }),
    ],
  });
};

const initCaptureConsoleWithHandler = (app: Express): void => {
  if (config.sentryDNS) {
    initCaptureConsole();

    // RequestHandler creates a separate execution context using domains, so that every
    // transaction/span/breadcrumb is attached to its own Hub instance
    app.use(Sentry.Handlers.requestHandler());

    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());

  } else {
    console.log('Sentry was not initialized as SENTRY_DNS env variable is missing');
  }
};

export default {
  initCaptureConsole,
  initCaptureConsoleWithHandler,
};
