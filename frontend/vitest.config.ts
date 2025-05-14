import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30_000,
    setupFiles: ['./vitest.setup.ts', './vitest.polyfills.js']
  }
});
