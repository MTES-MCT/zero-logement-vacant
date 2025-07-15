/// <reference types="vitest" />

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      external: [
        /node_modules\/(?!@codegouvfr)\/react-dsfr\/.+\\.js$/,
        /node_modules\/\.store\/(?!@codegouvfr-react-dsfr-npm-[^/]+)\/package\/.*\.js$/
      ]
    }
  },
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30_000,
    setupFiles: ['./vitest.setup.ts', './vitest.polyfills.js']
  }
});
