import { createTerminus } from '@godaddy/terminus';
import http from 'node:http';

import { logger } from '~/infra/logger';
import async from 'async';

export interface ShutdownOptions {
  closables?: Closable[];
}

export interface Closable {
  close(): Promise<void>;
}

export default function gracefulShutdown(
  server: http.Server,
  opts?: ShutdownOptions
) {
  createTerminus(server, {
    logger: (message, error) => {
      logger.error(message, error);
    },

    async onSignal(): Promise<void> {
      logger.info('Cleaning up before shutdown...');
      const closables = opts?.closables ?? [];
      await async.forEach(closables, async (closable) => {
        await closable.close();
      });
      logger.info('Cleaned up!');
    }
  });
}
