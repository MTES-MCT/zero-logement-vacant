import { createTerminus } from '@godaddy/terminus';
import { Application } from 'express';
import config from './config';

export default function gracefulShutdown(app: Application) {
  if (config.environment === 'production') {
    createTerminus(app);
  }
}
