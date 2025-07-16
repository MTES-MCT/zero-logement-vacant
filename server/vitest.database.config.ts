import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30_000,
    setupFiles: ['./src/test/setup-env.ts'],
    include: ['src/infra/database/**/*.test.ts']
  }
});
