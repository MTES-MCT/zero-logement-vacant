import express, { Application } from 'express';
import config from './config';
import { logger } from './infra/logger';


export interface Server {
  app: Application
  start(): Promise<void>
}

export function createServer(): Server {
  const app = express();

  function start(): Promise<void> {
    return new Promise((resolve) => {
      app.listen(config.app.port, () => {
        logger.info(`Server listening on ${config.app.port}`);
        resolve();
      });
    });
  }

  return {
    app,
    start
  }
}
