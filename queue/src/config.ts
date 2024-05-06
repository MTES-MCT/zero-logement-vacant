import convict from 'convict';
import dotenv from 'dotenv';
import path from 'node:path';

import { LOG_LEVELS, LogLevel } from '@zerologementvacant/utils';

export const isProduction = process.env.NODE_ENV === 'production';

interface Config {
  log: {
    level: LogLevel;
  };
  redis: {
    url: string;
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
    url: {
      env: 'REDIS_URL',
      format: String,
      default: isProduction ? null : 'redis://localhost:6379',
      nullable: false,
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
