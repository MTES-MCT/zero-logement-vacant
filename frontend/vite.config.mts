/// <reference types='vitest' />
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import os from 'node:os';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const port = Number(env.VITE_PORT) ?? 3000;

  return {
    root: import.meta.dirname,
    cacheDir: '../node_modules/.vite/frontend',
    server: {
      port: port,
      host: 'localhost',
      strictPort: true
    },
    preview: {
      port: port,
      host: 'localhost',
      strictPort: true
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
      // Vite 8 switched to lightningcss for CSS minification by default,
      // but it rejects unquoted SVG data URIs present in @codegouvfr/react-dsfr.
      // Switch back to esbuild until DSFR ships quoted URIs.
      cssMinify: 'esbuild',
      commonjsOptions: {
        transformMixedEsModules: true
      },
      rollupOptions: {
        external: [
          /node_modules\/(?!@codegouvfr)\/react-dsfr\/.+\\.js$/,
          /node_modules\/\.store\/(?!@codegouvfr-react-dsfr-npm-[^/]+)\/package\/.*\.js$/,
          // fetch-intercept/lib/browser.js has a dead-code path that requires
          // whatwg-fetch as a polyfill fallback; the package is not installed
          // because modern browsers have native fetch. Rolldown (Vite 8) is
          // stricter than Rollup and treats the unresolved import as an error,
          // so we mark it as external to keep the same runtime behaviour.
          'whatwg-fetch'
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
      coverage: {
        reportsDirectory: '../coverage/frontend',
        provider: 'v8' as const
      },
      testTimeout: 30_000,
      setupFiles: ['./vitest.setup.ts', './vitest.polyfills.js']
    }
  };
});
