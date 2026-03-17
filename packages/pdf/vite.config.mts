/// <reference types='vitest' />
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/pdf',
  resolve: {
    // In Vitest, .woff imports become browser URLs that @react-pdf/renderer
    // cannot read via fs. Redirect them to a stub returning the real file path.
    alias: process.env.VITEST
      ? [
          {
            find: /^.*\.(woff2?)$/,
            replacement: path.resolve(
              import.meta.dirname,
              'src/__mocks__/font.ts'
            )
          }
        ]
      : []
  },
  plugins: [
    react(),
    nxViteTsPaths(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(import.meta.dirname, 'tsconfig.lib.json')
    })
  ],
  // Development server configuration for previewer
  server: {
    open: '/src/preview/index.html'
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        browser: './src/browser.ts',
        node: './src/node.ts',
        'generators/campaign-worker-wrapper':
          './src/generators/campaign-worker-wrapper.ts',
        'generators/campaign.worker': './src/generators/campaign.worker.ts'
      },
      formats: ['es' as const]
    },
    // Exclude preview directory from production build
    sourcemap: mode !== 'production',
    rollupOptions: {
      external: [
        // Peer dependencies - consumers must provide these
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@react-pdf/renderer',
        // Node.js built-ins
        'node:module',
        'node:path',
        'node:stream',
        'node:url',
        'node:worker_threads'
        // @zerologementvacant/models is intentionally bundled:
        // the campaign worker runs in a standalone Node worker thread
        // where native ESM resolution would fail on models' dist output.
      ]
    },
    outDir: './dist/lib',
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true }
  },
  test: {
    watch: false,
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const
    }
  }
}));
