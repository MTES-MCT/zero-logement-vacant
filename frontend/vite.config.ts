/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../node_modules/.vite/frontend',
  resolve: {
    alias: {
      '@mui/material': path.resolve(__dirname, 'node_modules/@mui/material'),
      '@emotion/react': path.resolve(__dirname, 'node_modules/@emotion/react'),
      '@emotion/styled': path.resolve(__dirname, 'node_modules/@emotion/styled')
    }
  },
  server: {
    port: 3000,
    host: 'localhost'
  },
  preview: {
    port: 3000,
    host: 'localhost'
  },
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
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
