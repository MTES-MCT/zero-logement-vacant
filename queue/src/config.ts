import convict from 'convict';
import dotenv from 'dotenv';
import path from 'node:path';

import { LOG_LEVELS, LogLevel } from '../../shared';

export const isProduction = process.env.NODE_ENV === 'production';

interface Config {
  log: {
    level: LogLevel;
  };
  redis: {
    host: string;
    port: number;
    username: string | null;
    password: string | null;
  };
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

dotenv.config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const config = convict<Config>({
  log: {
    level: {
      env: 'LOG_LEVEL',
      format: LOG_LEVELS,
      default: LogLevel.DEBUG,
    },
  },
  redis: {
    host: {
      env: 'REDIS_HOST',
      format: String,
      default: 'localhost',
    },
    port: {
      env: 'REDIS_PORT',
      format: 'port',
      default: 6379,
    },
    username: {
      env: 'REDIS_USERNAME',
      format: String,
      default: null,
      nullable: !isProduction,
    },
    password: {
      env: 'REDIS_PASSWORD',
      format: String,
      default: null,
      nullable: !isProduction,
      sensitive: true,
    },
  },
  s3: {
    endpoint: {
      env: 'S3_ENDPOINT',
      format: String,
      default: isProduction ? null : 'http://localhost:9090',
    },
    region: {
      env: 'S3_REGION',
      format: String,
      default: isProduction ? null : 'whatever',
    },
    bucket: {
      env: 'S3_BUCKET',
      format: String,
      default: 'zerologementvacant',
    },
    accessKeyId: {
      env: 'S3_ACCESS_KEY_ID',
      format: String,
      default: isProduction ? null : 'key',
      sensitive: true,
    },
    secretAccessKey: {
      env: 'S3_SECRET_ACCESS_KEY',
      format: String,
      default: isProduction ? null : 'secret',
      sensitive: true,
    },
  },
})
  .validate({ allowed: 'strict' })
  .get();

export default config;
