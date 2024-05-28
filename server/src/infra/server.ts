import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import http from 'node:http';
import util from 'node:util';
import { createClient } from 'redis';

import {
  healthcheck,
  postgresCheck,
  redisCheck,
  s3Check,
} from '@zerologementvacant/healthcheck';
import RouteNotFoundError from '~/errors/routeNotFoundError';
import config from '~/infra/config';
import gracefulShutdown from '~/infra/graceful-shutdown';
import { logger } from '~/infra/logger';
import sentry from '~/infra/sentry';
import mockServices from '~/mocks';
import unprotectedRouter from '~/routers/unprotected';
import protectedRouter from '~/routers/protected';
import errorHandler from '~/middlewares/error-handler';

export interface Server {
  app: http.Server;
  start(): Promise<void>;
}

export function createServer(): Server {
  const app = express();

  sentry.init(app);

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://stats.beta.gouv.fr',
            'https://client.crisp.chat',
            'https://www.googletagmanager.com',
            'https://googleads.g.doubleclick.net',
          ],
          frameSrc: [
            'https://zerologementvacant-metabase-prod.osc-secnum-fr1.scalingo.io',
            'https://zerologementvacant.crisp.help',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.css',
            'https://client.crisp.chat/static/stylesheets/client_default.css',
            'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl.css',
          ],
          imgSrc: [
            "'self'",
            'https://stats.beta.gouv.fr',
            'https://image.crisp.chat',
            'https://client.crisp.chat',
            'https://www.google.fr',
            'https://www.google.com',
            'data:',
          ],
          fontSrc: [
            "'self'",
            'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.woff',
            'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.woff2',
            'https://cdn.jsdelivr.net/npm/remixicon@2.5.0/fonts/remixicon.ttf',
            'https://client.crisp.chat',
            'data:',
          ],
          objectSrc: ["'self'"],
          mediaSrc: ["'self'"],
          connectSrc: [
            "'self'",
            'https://stats.beta.gouv.fr',
            'https://api-adresse.data.gouv.fr',
            'wss://client.relay.crisp.chat',
            'https://client.crisp.chat',
            'https://openmaptiles.geo.data.gouv.fr',
            'https://openmaptiles.github.io',
            'https://unpkg.com',
          ],
          workerSrc: ["'self'", 'blob:'],
        },
      },
    }),
  );

  app.use(
    cors({
      origin: [
        config.app.host,
        'https://stats.beta.gouv.fr',
        'http://localhost:3000',
      ],
    }),
  );

  // Mock services like Datafoncier API on specific environments
  mockServices();

  app.use(express.json());

  app.use(
    rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes window
      max: config.rateLimit.max, // start blocking after X requests for windowMs time
      message: 'Too many request from this address, try again later please.',
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get(
    '/',
    healthcheck({
      checks: [
        redisCheck(config.redis.url),
        postgresCheck(config.db.url),
        s3Check(config.s3),
      ],
      logger,
    }),
  );

  app.use('/api', unprotectedRouter);
  app.use('/api', protectedRouter);

  app.all('*', (request) => {
    throw new RouteNotFoundError(request);
  });
  sentry.errorHandler(app);
  app.use(errorHandler());

  const server = http.createServer(app);
  gracefulShutdown(server);

  async function start(): Promise<void> {
    const listen = util.promisify((port: number, cb: () => void) => {
      return server.listen(port, cb);
    });

    try {
      await listen(config.app.port);
      logger.info(`Server listening on ${config.app.port}`);
    } catch (error) {
      logger.error('Unable to start the server', error);
      throw error;
    }
  }

  return {
    app: server,
    start,
  };
}
