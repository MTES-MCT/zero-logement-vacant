import { createTerminus } from '@godaddy/terminus';
import http from 'node:http';

import { logger } from '~/infra/logger';

export default function gracefulShutdown(server: http.Server) {
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

function isRejected(
  promise: PromiseSettledResult<any>,
): promise is PromiseRejectedResult {
  return promise.status === 'rejected';
}
