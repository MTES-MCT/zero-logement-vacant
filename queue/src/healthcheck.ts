import { createTerminus, HealthCheckError } from '@godaddy/terminus';
import http from 'node:http';

export default function registerHealthcheck(server: http.Server) {
  createTerminus(server, {
    healthChecks: {
      '/': async ({ state }) => {
        if (state.isShuttingDown) {
          return true;
        }

        const checks: Promise<any>[] = [
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
  });
}

function isRejected(
  promise: PromiseSettledResult<any>,
): promise is PromiseRejectedResult {
  return promise.status === 'rejected';
}
