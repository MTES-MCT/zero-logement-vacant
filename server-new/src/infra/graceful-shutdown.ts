import { createTerminus } from '@godaddy/terminus';
import { Application } from 'express';

import config from './config';
import { logger } from './logger';

export default function gracefulShutdown(app: Application) {
  if (config.app.env === 'production') {
    createTerminus(app, {
      logger: (message, error) => {
        logger.error(message, error);
      },

      async onSignal(): Promise<void> {
        logger.info('Cleaning up before shutdown...');
        // TODO: close database connection
      },
    });
  }
}
