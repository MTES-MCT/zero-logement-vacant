import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  plugins: [nxViteTsPaths()],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30_000,
    setupFiles: ['./src/test/setup-env.ts', './vitest.setup.ts'],
    globalSetup: './src/test/global-setup.ts',
    reporters: ['default'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/infra/database/migrations',
        'src/test/**',
        'src/**/index.ts',
        'src/types/**'
      ]
    },
    include: ['src/**/*.test.ts'],
    exclude: ['src/infra/database/migrations/**/*.test.ts']
  }
});
