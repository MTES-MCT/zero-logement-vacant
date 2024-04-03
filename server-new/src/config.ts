import convict from 'convict';
import dotenv from 'dotenv';
import path from 'node:path';

import { LOG_LEVELS, LogLevel } from '@zerologementvacant/shared';

interface Config {
  app: {
    env: 'development' | 'test' | 'production'
    host: string;
    port: number;
  }
  log: {
    level: LogLevel;
  }
}

dotenv.config({
  path: path.join(__dirname, '..', '.env')
})

const config = convict<Config>({
  app: {
    env: {
      env: 'NODE_ENV',
      format: ['development', 'test', 'production'],
      default: 'development',
    },
    host: {
      env: 'APP_HOST',
      format: String,
      default: 'http://localhost:3001',
    },
    port: {
      env: 'APP_PORT',
      format: 'port',
      default: 3001,
    },
  },
  log: {
    level: {
      env: 'LOG_LEVEL',
      format: LOG_LEVELS,
      default: LogLevel.INFO
    }
  }
})
  .validate({ allowed: 'strict' })
  .get();

export default config;
