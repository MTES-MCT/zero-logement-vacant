import { useCallback } from 'react';
import sentry from '../utils/sentry';
import type { Breadcrumb, User } from '@sentry/react';

/**
 * Hook for using Sentry in React components
 * Provides simplified methods for error reporting
 */
export function useSentry() {
  const captureException = useCallback(
    (error: Error | unknown, context?: Record<string, any>) => {
      if (context) {
        sentry.captureException(error, {
          contexts: { additional: context }
        });
      } else {
        sentry.captureException(error);
      }
    },
    []
  );

  const captureMessage = useCallback(
    (
      message: string,
      level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
    ) => {
      sentry.captureMessage(message, level);
    },
    []
  );

  const addBreadcrumb = useCallback(
    (
      breadcrumb: Pick<Breadcrumb, 'message' | 'category' | 'level' | 'data'>
    ) => {
      sentry.addBreadcrumb(breadcrumb);
    },
    []
  );

  const setUser = useCallback((user: User) => {
    sentry.setUser(user);
  }, []);

  const setContext = useCallback(
    (...args: Parameters<typeof sentry.setContext>) => {
      sentry.setContext(...args);
    },
    []
  );

  const setTag = useCallback((...args: Parameters<typeof sentry.setTag>) => {
    sentry.setTag(...args);
  }, []);

  return {
    captureException,
    captureMessage,
    addBreadcrumb,
    setUser,
    setContext,
    setTag
  };
};

export default useSentry;
