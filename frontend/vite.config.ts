import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      external: [
        /node_modules\/(?!@codegouvfr)\/.+\\.js$/,
        /node_modules\/\.store\/(?!@codegouvfr-react-dsfr-npm-[^/]+)\/package\/.*\.js$/
      ]
    }
  },
  plugins: [react()]
});
