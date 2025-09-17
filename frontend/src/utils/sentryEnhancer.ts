import sentry from './sentry';

/**
 * Utilities to enrich Sentry data and improve Frontend Insights
 */

// Track route changes for better navigation insights
export const trackNavigation = (fromPath: string, toPath: string) => {
  sentry.addBreadcrumb({
    message: `Navigation from ${fromPath} to ${toPath}`,
    category: 'navigation',
    level: 'info',
    data: {
      from: fromPath,
      to: toPath,
      timestamp: Date.now(),
    },
  });

  // Set current page context
  sentry.setContext('page', {
    path: toPath,
    referrer: fromPath,
    timestamp: new Date().toISOString(),
  });
};

// Track user actions for better UX insights
export const trackUserAction = (action: string, element?: string, data?: Record<string, any>) => {
  sentry.addBreadcrumb({
    message: `User action: ${action}${element ? ` on ${element}` : ''}`,
    category: 'user-action',
    level: 'info',
    data: {
      action,
      element,
      ...data,
      timestamp: Date.now(),
    },
  });
};

// Track API calls for performance insights
export const trackApiCall = (method: string, url: string, status?: number, duration?: number) => {
  const level = status && status >= 400 ? 'error' : 'info';
  
  sentry.addBreadcrumb({
    message: `API ${method.toUpperCase()} ${url} ${status ? `(${status})` : ''}`,
    category: 'http',
    level,
    data: {
      method,
      url,
      status,
      duration,
      timestamp: Date.now(),
    },
  });

  // If it's an error, also set context
  if (status && status >= 400) {
    sentry.setContext('api-error', {
      method,
      url,
      status,
      duration,
      timestamp: new Date().toISOString(),
    });
  }
};

// Track performance issues
export const trackPerformanceIssue = (type: string, value: number, threshold: number) => {
  if (value > threshold) {
    sentry.addBreadcrumb({
      message: `Performance issue: ${type} (${value}ms > ${threshold}ms)`,
      category: 'performance',
      level: 'warning',
      data: {
        type,
        value,
        threshold,
        timestamp: Date.now(),
      },
    });
  }
};

// Set business context
export const setBusinessContext = (context: {
  userRole?: string;
  feature?: string;
  workflow?: string;
  [key: string]: any;
}) => {
  sentry.setContext('business', {
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// Track feature usage
export const trackFeatureUsage = (feature: string, action: string, metadata?: Record<string, any>) => {
  sentry.addBreadcrumb({
    message: `Feature usage: ${feature} - ${action}`,
    category: 'feature',
    level: 'info',
    data: {
      feature,
      action,
      ...metadata,
      timestamp: Date.now(),
    },
  });

  // Set current feature context
  sentry.setTag('current-feature', feature);
  sentry.setContext('feature-usage', {
    feature,
    action,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

// Enhanced error tracking with context
export const trackError = (error: Error, context: {
  component?: string;
  action?: string;
  userId?: string;
  feature?: string;
  [key: string]: any;
}) => {
  // Set additional context
  sentry.setContext('error-context', {
    ...context,
    timestamp: new Date().toISOString(),
  });

  // Add tags for better filtering
  if (context.component) sentry.setTag('error-component', context.component);
  if (context.feature) sentry.setTag('error-feature', context.feature);

  // Capture the error
  sentry.captureException(error);
};

export default {
  trackNavigation,
  trackUserAction,
  trackApiCall,
  trackPerformanceIssue,
  setBusinessContext,
  trackFeatureUsage,
  trackError,
};
