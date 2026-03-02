/// <reference types='vitest' />
import react from '@vitejs/plugin-react';
import * as path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/pdf',
  plugins: [
    react(),
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
        node: './src/node.ts'
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
        // Workspace dependencies - already available in monorepo
        '@zerologementvacant/models',
        // Node.js built-ins
        'node:stream'
        // Bundle everything else (react-pdf-html, ts-pattern, etc.)
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
