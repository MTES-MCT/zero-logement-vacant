import convict from 'convict';
import dotenv from 'dotenv';
import path from 'node:path';

import { LOG_LEVELS, LogLevel } from '@zerologementvacant/utils';

interface Config {
  api: {
    host: string;
  };
  auth: {
    secret: string;
  };
  log: {
    level: LogLevel;
  };
}

dotenv.config({
  path: path.join(__dirname, '..', '..', '.env'),
});

export const isProduction = process.env.NODE_ENV === 'production';

// TODO: avoid using config in a non-configurable package
// because it has no entry point anyway
const config = convict<Config>({
  api: {
    host: {
      env: 'API_HOST',
      format: String,
      default: isProduction ? null : 'http://localhost:3001/api',
    },
  },
  auth: {
    secret: {
      env: 'AUTH_SECRET',
      format: String,
      default: isProduction ? null : 'secret',
    },
  },
  log: {
    level: {
      env: 'LOG_LEVEL',
      format: LOG_LEVELS,
      default: LogLevel.INFO,
    },
  },
})
  .validate({ allowed: 'strict' })
  .get();

export default config;
