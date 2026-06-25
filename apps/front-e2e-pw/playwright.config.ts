import { defineConfig, devices } from '@playwright/test';

import config from './config';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // Retry on CI to absorb genuine flakiness; locally a failure is a failure
  // so the test author sees it immediately.
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: config.baseURL,
    // Trace on first retry — small enough that CI artifact size stays sane,
    // detailed enough to fully reconstruct any flaky failure in the trace
    // viewer (`npx playwright show-trace <path>`).
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
