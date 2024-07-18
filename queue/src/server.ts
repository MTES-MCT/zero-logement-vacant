import express from 'express';
import util from 'node:util';

import {
  healthcheck,
  postgresCheck,
  redisCheck,
  s3Check
} from '@zerologementvacant/healthcheck';
import config from './config';
import { createLogger } from './logger';
import { createDashboard } from './dashboard';
import { createBasicAuth } from './basic-auth';

function createServer() {
  const app = express();

  const logger = createLogger('queue');
  app.set('trust proxy', 1);

  app.get(
    '/',
    healthcheck({
      checks: [
        redisCheck(config.redis.url),
        postgresCheck(config.db.url),
        s3Check(config.s3)
      ],
      logger,
    })
  );

  app.use('/queues', createBasicAuth().check(createDashboard()));

  async function start(): Promise<void> {
    const listen = util.promisify((port: number, cb: () => void) => {
      return app.listen(port, cb);
    });

    await listen(config.app.port);
    logger.info(`Server listening on ${config.app.port}`);
  }

  return {
    app,
    start,
  };
}

export default createServer;
