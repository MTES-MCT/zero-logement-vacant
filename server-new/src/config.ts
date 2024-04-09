import convict from 'convict';
import formats from 'convict-format-with-validator';
import dotenv from 'dotenv';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { LOG_LEVELS, LogLevel } from '@zerologementvacant/shared';

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
});

const isProduction = process.env.NODE_ENV === 'production';

convict.addFormats(formats);
convict.addFormat({
  name: 'strict-boolean',
  validate(val: any) {
    return typeof val === 'string' && val === 'true';
  },
  coerce: (val: string): boolean => val === 'true',
});
convict.addFormat({
  name: 'comma-separated string',
  validate(val: any) {
    return typeof val === 'string';
  },
  coerce(val: string): string[] {
    return val.split(',').map((str) => str.trim());
  },
});

interface Config {
  app: {
    batchSize: number;
    env: 'development' | 'test' | 'production';
    isReviewApp: boolean;
    host: string;
    port: number;
  };
  auth: {
    secret: string;
    expiresIn: string;
  };
  ban: {
    api: {
      endpoint: string;
    };
    update: {
      pageSize: number;
      delay: string;
    };
  };
  cerema: {
    api: string;
    enabled: boolean;
    token: string;
  };
  datafoncier: {
    api: string;
    enabled: boolean;
    token: string | null;
  };
  db: {
    url: string;
    pool: {
      max: number;
    };
  };
  log: {
    level: LogLevel;
  };
  metabase: {
    domain: string;
    token: string;
  };
  sentry: {
    dsn: string | null;
    enabled: boolean;
  };
}

const config = convict<Config>({
  app: {
    batchSize: {
      env: 'BATCH_SIZE',
      format: 'int',
      default: 1_000,
    },
    env: {
      env: 'NODE_ENV',
      format: ['development', 'test', 'production'],
      default: 'development',
    },
    isReviewApp: {
      env: 'IS_REVIEW_APP',
      format: 'strict-boolean',
      default: false,
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
  auth: {
    secret: {
      env: 'AUTH_SECRET',
      format: String,
      sensitive: true,
      default: isProduction ? null : uuidv4(),
    },
    expiresIn: {
      env: 'AUTH_EXPIRES_IN',
      format: String,
      default: '12 hours',
    },
  },
  ban: {
    api: {
      endpoint: {
        env: 'BAN_API_ENDPOINT',
        format: 'url',
        default: 'https://api-adresse.data.gouv.fr',
      },
    },
    update: {
      pageSize: {
        env: 'BAN_UPDATE_PAGE_SIZE',
        format: 'int',
        default: 2_000,
      },
      delay: {
        env: 'BAN_UPDATE_DELAY',
        format: String,
        default: '1 months',
      },
    },
  },
  cerema: {
    api: {
      env: 'CEREMA_API',
      format: 'url',
      default: 'https://getdf.cerema.fr',
    },
    enabled: {
      env: 'CEREMA_ENABLED',
      format: 'strict-boolean',
      default: isProduction,
    },
    token: {
      env: 'CEREMA_TOKEN',
      format: String,
      sensitive: true,
      default: null,
    },
  },
  datafoncier: {
    api: {
      env: 'DATAFONCIER_API',
      format: String,
      default: 'https://apidf-preprod.cerema.fr',
    },
    enabled: {
      env: 'DATAFONCIER_ENABLED',
      format: 'strict-boolean',
      default: false,
    },
    token: {
      env: 'DATAFONCIER_TOKEN',
      format: String,
      default: null,
      nullable: true,
      sensitive: true,
    },
  },
  db: {
    url: {
      env: 'DATABASE_URL',
      format: String,
      default: isProduction
        ? null
        : 'postgresql://postgres:postgres@localhost:5432/zerologementvacant',
      nullable: false,
    },
    pool: {
      max: {
        env: 'DATABASE_POOL_MAX',
        format: 'int',
        default: 10,
      },
    },
  },
  log: {
    level: {
      env: 'LOG_LEVEL',
      format: LOG_LEVELS,
      default: LogLevel.INFO,
    },
  },
  metabase: {
    domain: {
      env: 'METABASE_DOMAIN',
      format: 'url',
      nullable: true,
      default: null,
    },
    token: {
      env: 'METABASE_TOKEN',
      format: String,
      default: null,
      sensitive: true,
    },
  },
  sentry: {
    dsn: {
      env: 'SENTRY_DSN',
      format: String,
      default: null,
      nullable: true,
    },
    enabled: {
      env: 'SENTRY_ENABLED',
      format: Boolean,
      default: isProduction,
    },
  },
})
  .validate({ allowed: 'strict' })
  .get();

export default config;
