/// <reference types='vitest' />
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react-swc';
import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../node_modules/.vite/frontend',
  server: {
    port: 3000,
    host: 'localhost'
  },
  preview: {
    port: 3000,
    host: 'localhost'
  },
  plugins: [react(), nxViteTsPaths()],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [],
  // },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      external: [
        /node_modules\/(?!@codegouvfr)\/react-dsfr\/.+\\.js$/,
        /node_modules\/\.store\/(?!@codegouvfr-react-dsfr-npm-[^/]+)\/package\/.*\.js$/
      ]
    }
  },
  test: {
    watch: false,
    globals: true,
    environment: 'happy-dom',
    execArgv: [
      '--localstorage-file',
      path.resolve(os.tmpdir(), `vitest-${process.pid}.localstorage`)
    ],
    env: {
      TZ: 'UTC'
    },
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../coverage/frontend',
      provider: 'v8' as const
    },
    testTimeout: 30_000,
    setupFiles: ['./vitest.setup.ts', './vitest.polyfills.js']
  }
}));
