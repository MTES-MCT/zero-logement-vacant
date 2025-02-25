import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createBrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType
} from 'react-router-dom';

import config from './config';

function init(): void {
  if (config.sentry.enabled) {
    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.env,
      integrations: [
        // This enables automatic instrumentation
        // https://docs.sentry.io/platforms/javascript/guides/react/tracing/
        Sentry.browserTracingIntegration(),
        // https://docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/react-router/
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        })
      ],
      sampleRate: 0.2,
      tracesSampleRate: 0.2,
      tracePropagationTargets: ['localhost', config.apiEndpoint]
    });
  }
}

const createSentryRouter =
  Sentry.wrapCreateBrowserRouterV6(createBrowserRouter);

const sentry = {
  init,
  createBrowserRouter: createSentryRouter
};

export default sentry;
