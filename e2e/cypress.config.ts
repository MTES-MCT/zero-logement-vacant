import { defineConfig } from 'cypress';

import configuration from './config';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here

      return { ...config, env: configuration, };
    },
  },
  viewportWidth: 1920,
  viewportHeight: 1080,
});
