import react from '@vitejs/plugin-react-swc';
import dts from 'vite-plugin-dts';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/pdf',
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json')
    })
  ],
  build: {
    outDir: path.join(__dirname, './dist/lib'),
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: {
        browser: path.join(__dirname, 'src/browser.ts'),
        node: path.join(__dirname, 'src/node.ts')
      },
      name: 'test',
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      formats: ['es' as const]
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: ['react', 'react-dom', 'react/jsx-runtime']
    }
  },
  test: {
    name: 'test',
    globals: true,
    watch: false,
    environment: 'happy-dom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const
    },
    setupFiles: ['./vitest.setup.ts']
  }
}));
