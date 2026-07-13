import { defineConfig, devices } from '@playwright/test';

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
    // Read directly from process.env so this file can be imported by
    // `@nx/playwright`'s plugin inference (which runs before nx loads
    // .env). At target execution time nx populates process.env from
    // .env, so the value is set. Full env validation still happens via
    // zod when `loadConfig()` is called from fixtures/specs at runtime.
    baseURL: process.env.CYPRESS_BASE_URL,
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
