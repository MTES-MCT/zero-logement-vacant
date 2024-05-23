import { createTerminus, HealthCheckError } from '@godaddy/terminus';
import http from 'node:http';

import { logger } from '~/infra/logger';
import db from '~/infra/database';

export default function gracefulShutdown(server: http.Server) {
  createTerminus(server, {
    healthChecks: {
      '/healthcheck': async ({ state }) => {
        if (state.isShuttingDown) {
          return true;
        }

        const checks: Promise<any>[] = [
          db.raw('SELECT 1 + 1'),
          // Add more
        ];

        await Promise.allSettled(checks)
          .then((promises) => {
            return promises
              .filter(isRejected)
              .map((rejected) => rejected.reason);
          })
          .then((errors) => {
            if (errors.length) {
              throw new HealthCheckError('Healthcheck failed', errors);
            }
          });
      },
    },

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
