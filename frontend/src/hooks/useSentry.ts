import { useCallback } from 'react';
import sentry from '../utils/sentry';

interface UseSentryReturn {
  captureException: (error: Error | unknown, context?: Record<string, any>) => void;
  captureMessage: (message: string, level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug') => void;
  addBreadcrumb: (breadcrumb: { message: string; category?: string; level?: string; data?: Record<string, any> }) => void;
  setUser: (user: { id?: string; email?: string; username?: string; [key: string]: any }) => void;
  setContext: (key: string, context: Record<string, any>) => void;
  setTag: (key: string, value: string) => void;
}

/**
 * Hook for using Sentry in React components
 * Provides simplified methods for error reporting
 */
export const useSentry = (): UseSentryReturn => {
  const captureException = useCallback((error: Error | unknown, context?: Record<string, any>) => {
    if (context) {
      sentry.captureException(error, {
        contexts: { additional: context }
      });
    } else {
      sentry.captureException(error);
    }
  }, []);

  const captureMessage = useCallback((
    message: string, 
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
  ) => {
    sentry.captureMessage(message, level);
  }, []);

  const addBreadcrumb = useCallback((breadcrumb: {
    message: string;
    category?: string;
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
    data?: Record<string, any>;
  }) => {
    sentry.addBreadcrumb(breadcrumb);
  }, []);

  const setUser = useCallback((user: {
    id?: string;
    email?: string;
    username?: string;
    [key: string]: any;
  }) => {
    sentry.setUser(user);
  }, []);

  const setContext = useCallback((key: string, context: Record<string, any>) => {
    sentry.setContext(key, context);
  }, []);

  const setTag = useCallback((key: string, value: string) => {
    sentry.setTag(key, value);
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
