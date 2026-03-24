import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';
import { defineConfig } from 'cypress';

import configuration from './config';

const preset = nxE2EPreset(__filename, { cypressDir: 'cypress' });

export default defineConfig({
  e2e: {
    ...preset,
    async setupNodeEvents(on, config) {
      await preset.setupNodeEvents?.(on, config);
      return { ...config, env: { ...config.env, ...configuration } };
    }
  },
  viewportWidth: 1920,
  viewportHeight: 1080
});
