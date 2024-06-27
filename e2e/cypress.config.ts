import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents() {
      // implement node event listeners here
    }
  },
  viewportWidth: 1920,
  viewportHeight: 1080
});
