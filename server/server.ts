import express, { Application } from 'express';
// Allows to throw an error or reject a promise in controllers
// instead of having to call the next(err) function.
import 'express-async-errors';
import path from 'path';
import unprotectedRouter from './routers/unprotected';
import config from './utils/config';
import cors from 'cors';
import sentry from './utils/sentry';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import fileUpload from 'express-fileupload';
import errorHandler from './middlewares/error-handler';
import RouteNotFoundError from './errors/routeNotFoundError';
import protectedRouter from './routers/protected';

const PORT = config.serverPort;

export interface Server {
  app: Application;
  start(): Promise<void>;
}

export function createServer(): Server {
  const app = express();

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://stats.beta.gouv.fr',
            'https://stats.data.gouv.fr',
            'https://client.crisp.chat',
            'https://renderer-assets.typeform.com',
          ],
          frameSrc: [
            'https://form.typeform.com',
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
            'https://image.crisp.chat',
            'https://client.crisp.chat',
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
            'https://stats.data.gouv.fr',
            'wss://client.relay.crisp.chat',
            'https://client.crisp.chat',
          ],
          workerSrc: ["'self'", 'blob:'],
        },
      },
    })
  );

  if (config.environment === 'development') {
    app.use(cors({ origin: 'http://localhost:3000' }));
  }

  app.use(fileUpload());
  app.use(express.json());

  const rateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes window
    max: config.maxRate, // start blocking after X requests for windowMs time
    message: 'Too many request from this address, try again later please.',
  });
  app.use(rateLimiter);

  app.use('/api', unprotectedRouter);
  app.use('/api', protectedRouter);

  if (config.environment === 'production') {
    sentry.initCaptureConsoleWithHandler(app);

    app.use(express.static(path.join(__dirname, '../../frontend/build')));
    app.get('*', function (req: any, res: { sendFile: (arg0: any) => void }) {
      res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
    });
  }

  app.all('*', () => {
    throw new RouteNotFoundError();
  });
  app.use(errorHandler());

  function start(): Promise<void> {
    return new Promise((resolve) => {
      app.listen(PORT, () => {
        console.log(`Server listening on ${PORT}`);
        resolve();
      });
    });
  }

  return {
    app,
    start,
  };
}
