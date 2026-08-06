import * as Sentry from '@sentry/react';
import { redactSensitiveData } from '@zerologementvacant/utils';
import { useEffect } from 'react';
import {
  createBrowserRouter,
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType
} from 'react-router';

import config from './config';

export function sanitizeEvent<T extends Sentry.Event>(event: T): T {
  return redactSensitiveData(event);
}

export function sanitizeBreadcrumb<T extends Sentry.Breadcrumb>(
  breadcrumb: T
): T {
  return redactSensitiveData(breadcrumb);
}

function describeException(
  exception: unknown
): Readonly<Record<string, string>> {
  return exception instanceof Error
    ? { name: exception.name }
    : { type: typeof exception };
}

function init(): void {
  if (config.sentry.enabled) {
    console.log('Initializing Sentry with:', {
      dsn: config.sentry.dsn ? 'configured' : 'missing',
      environment: config.sentry.env,
      enabled: config.sentry.enabled
    });

    Sentry.init({
      dsn: config.sentry.dsn,
      environment: config.sentry.env,
      release: `frontend@${import.meta.env.VITE_APP_VERSION || 'unknown'}`,
      integrations: [
        // Browser performance and error tracking
        Sentry.browserTracingIntegration(),
        // React Router v7 integration
        Sentry.reactRouterV7BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        }),
        // Web Vitals for Frontend Insights
        Sentry.reportingObserverIntegration(),
        // Enhanced user interactions
        Sentry.browserProfilingIntegration(),
        // Replay for debugging
        Sentry.replayIntegration({
          maskAllInputs: true,
          maskAllText: true,
          blockAllMedia: false,
          networkDetailDenyUrls: [
            /\/reset-links(?:\/|$)/,
            /\/account\/reset-password(?:\/|$)/
          ],
          beforeAddRecordingEvent: redactSensitiveData
        })
      ],
      sampleRate: config.sentry.sampleRate,
      tracesSampleRate: config.sentry.tracesSampleRate,
      // Enable profiling
      profilesSampleRate: 0.1,
      // Enable session replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      tracePropagationTargets: ['localhost', config.apiEndpoint, /^\//],

      // Enhanced error handling
      beforeSend(event) {
        const sanitized = sanitizeEvent(event);
        // Add custom tags for better organization
        sanitized.tags = {
          ...sanitized.tags,
          component: 'frontend',
          framework: 'react',
          bundler: 'vite'
        };

        // Log errors to console in development
        if (config.sentry.env === 'development') {
          console.error('Sentry error:', sanitized);
        }
        return sanitized;
      },

      // Enhanced transaction processing
      beforeSendTransaction(event) {
        const sanitized = sanitizeEvent(event);
        // Add performance context
        sanitized.tags = {
          ...sanitized.tags,
          component: 'frontend',
          framework: 'react'
        };
        return sanitized;
      },

      // Auto-capture console errors
      beforeBreadcrumb(breadcrumb) {
        const sanitized = sanitizeBreadcrumb(breadcrumb);
        if (breadcrumb.category === 'console' && breadcrumb.level === 'error') {
          // This will help track console errors
          return sanitized;
        }
        return sanitized;
      }
    });

    // Global error handlers for uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', describeException(event.error));
      Sentry.captureException(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error(
        'Unhandled promise rejection:',
        describeException(event.reason)
      );
      Sentry.captureException(event.reason);
    });

    // Initialize Web Vitals tracking for Frontend Insights
    initWebVitals();

    console.log('Sentry initialized successfully');
  } else {
    console.warn('Sentry is disabled. Errors will not be reported.');
  }
}

// Web Vitals integration for Frontend Insights
function initWebVitals() {
  // Import web-vitals dynamically to avoid bundle bloat
  import('web-vitals')
    .then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS((metric: any) => {
        Sentry.addBreadcrumb({
          message: `CLS: ${metric.value}`,
          category: 'web-vital',
          level: 'info',
          data: metric
        });
      });

      onINP((metric: any) => {
        Sentry.addBreadcrumb({
          message: `INP: ${metric.value}ms`,
          category: 'web-vital',
          level: 'info',
          data: metric
        });
      });

      onFCP((metric: any) => {
        Sentry.addBreadcrumb({
          message: `FCP: ${metric.value}ms`,
          category: 'web-vital',
          level: 'info',
          data: metric
        });
      });

      onLCP((metric: any) => {
        Sentry.addBreadcrumb({
          message: `LCP: ${metric.value}ms`,
          category: 'web-vital',
          level: 'info',
          data: metric
        });
      });

      onTTFB((metric: any) => {
        Sentry.addBreadcrumb({
          message: `TTFB: ${metric.value}ms`,
          category: 'web-vital',
          level: 'info',
          data: metric
        });
      });
    })
    .catch((error) => {
      console.warn('Failed to load web-vitals:', error);
    });
}

const createSentryRouter: typeof createBrowserRouter =
  Sentry.wrapCreateBrowserRouterV7(createBrowserRouter);

// Export Sentry ErrorBoundary and utilities
const ErrorBoundary = Sentry.ErrorBoundary;
const captureException = Sentry.captureException;
const captureMessage = Sentry.captureMessage;
const withErrorBoundary = Sentry.withErrorBoundary;
const setUser = Sentry.setUser;
const setTag = Sentry.setTag;
const setContext = Sentry.setContext;
const addBreadcrumb = Sentry.addBreadcrumb;

interface SentryUtils {
  init: () => void;
  createBrowserRouter: typeof createSentryRouter;
  ErrorBoundary: typeof ErrorBoundary;
  captureException: typeof captureException;
  captureMessage: typeof captureMessage;
  withErrorBoundary: typeof withErrorBoundary;
  setUser: typeof setUser;
  setTag: typeof setTag;
  setContext: typeof setContext;
  addBreadcrumb: typeof addBreadcrumb;
}

const sentry: SentryUtils = {
  init,
  createBrowserRouter: createSentryRouter,
  ErrorBoundary,
  captureException,
  captureMessage,
  withErrorBoundary,
  setUser,
  setTag,
  setContext,
  addBreadcrumb
};

export default sentry;
