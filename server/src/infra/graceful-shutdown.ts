import { createTerminus } from '@godaddy/terminus';
import http from 'node:http';

import config from './config';
import { logger } from './logger';

export default function gracefulShutdown(server: http.Server) {
  if (config.app.env === 'production') {
    createTerminus(server, {
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
