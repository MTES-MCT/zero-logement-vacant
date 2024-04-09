import express, { Application, Request, Response } from 'express';
import path from 'node:path';

import config from '~/infra/config';
import { logger } from '~/infra/logger';
import gracefulShutdown from '~/infra/graceful-shutdown';
import sentry from '~/infra/sentry';

export interface Server {
  app: Application;
  start(): Promise<void>;
}

export function createServer(): Server {
  const app = express();

  sentry.init(app);

  app.use(express.json());

  // Serve the frontend in production
  if (config.app.env === 'production') {
    const build = path.join(__dirname, '..', '..', 'frontend-new', 'build');
    app.use(express.static(build));
    app.get('*', (request: Request, response: Response) => {
      const index = path.join(build, 'index.html');
      response.sendFile(index);
    });
  }

  sentry.errorHandler(app);

  gracefulShutdown(app);

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
    start,
  };
}
