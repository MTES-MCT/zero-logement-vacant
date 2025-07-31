import { createTerminus } from '@godaddy/terminus';
import http from 'node:http';

import { createLogger } from '~/infra/logger';

const logger = createLogger('graceful-shutdown');

export default function gracefulShutdown(server: http.Server) {
  createTerminus(server, {
    logger: (message, error) => {
      logger.error(message, error);
    },

    async beforeShutdown() {
      logger.info('Before shutdown...');
    },

    async onShutdown() {
      logger.info('On shutdown...');
    },

    signals: ['SIGINT', 'SIGTERM', 'SIGHUP'],

    async onSignal(): Promise<void> {
      logger.info('Cleaning up before shutdown...');
      // TODO: close database connection
    }
  });
}
