import { afterEach, describe, expect, it, vi } from 'vitest';

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  init: vi.fn(),
  replayIntegration: vi.fn(() => ({}))
}));

vi.mock('@sentry/react', () => ({
  ErrorBoundary: () => null,
  addBreadcrumb: vi.fn(),
  browserProfilingIntegration: vi.fn(() => ({})),
  browserTracingIntegration: vi.fn(() => ({})),
  captureException: sentryMocks.captureException,
  captureMessage: vi.fn(),
  init: sentryMocks.init,
  reactRouterV7BrowserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: sentryMocks.replayIntegration,
  reportingObserverIntegration: vi.fn(() => ({})),
  setContext: vi.fn(),
  setTag: vi.fn(),
  setUser: vi.fn(),
  withErrorBoundary: vi.fn(),
  wrapCreateBrowserRouterV7: vi.fn((createRouter) => createRouter)
}));

vi.mock('../config', () => ({
  default: {
    apiEndpoint: 'http://localhost:3001/api',
    sentry: {
      dsn: 'https://sentry.example.test/1',
      enabled: true,
      env: 'test',
      sampleRate: 1,
      tracesSampleRate: 1
    }
  }
}));

import sentry from '../sentry';

describe('Sentry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('should not log raw errors or rejection reasons from global handlers', () => {
    const token = 'A'.repeat(100);
    const error = new Error(`Request failed: /reset-links/${token}`);
    const rejectionReason = { password: 'MotDePasse123' };
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    sentry.init();

    window.dispatchEvent(new ErrorEvent('error', { error }));
    const rejectionEvent = new Event('unhandledrejection');
    Object.defineProperty(rejectionEvent, 'reason', { value: rejectionReason });
    window.dispatchEvent(rejectionEvent);

    expect(consoleError.mock.calls.flat()).not.toContain(error);
    expect(consoleError.mock.calls.flat()).not.toContain(rejectionReason);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(error);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(rejectionReason);
  });

  it('should mask DOM text in session replays', () => {
    sentry.init();

    expect(sentryMocks.replayIntegration).toHaveBeenCalledWith(
      expect.objectContaining({
        maskAllInputs: true,
        maskAllText: true
      })
    );
  });
});
