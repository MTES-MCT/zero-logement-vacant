import convict from 'convict';
import formats from 'convict-format-with-validator';
import dotenv from 'dotenv';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { LOG_LEVELS, LogLevel } from '@zerologementvacant/shared';

dotenv.config({
  path: path.join(__dirname, '..', '..', '.env'),
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
    system: string;
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
  mailer: {
    from: string;
    provider: 'brevo' | 'nodemailer';
    host: string | null;
    port: number | null;
    user: string | null;
    password: string | null;
    /**
     * Provide this if the provider is sendinblue
     */
    apiKey: string | null;
    eventApiKey: string | null;
    secure: boolean;
  };
  metabase: {
    domain: string;
    token: string;
  };
  rateLimit: {
    max: number;
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
    system: {
      env: 'SYSTEM_ACCOUNT',
      format: String,
      default: 'admin@zerologementvacant.beta.gouv.fr',
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
        : 'postgresql://postgres:postgres@localhost:5432/zlv',
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
  mailer: {
    from: {
      // TODO: change this to 'MAILER_FROM'
      env: 'MAIL_FROM',
      format: String,
      default: 'contact@zerologementvacant.beta.gouv.fr',
    },
    provider: {
      env: 'MAILER_PROVIDER',
      format: ['brevo', 'nodemailer'],
      default: 'nodemailer',
    },
    host: {
      env: 'MAILER_HOST',
      format: String,
      default: null,
      nullable: true,
    },
    port: {
      env: 'MAILER_PORT',
      format: 'port',
      default: null,
      nullable: true,
    },
    user: {
      env: 'MAILER_USER',
      format: String,
      default: null,
      nullable: true,
    },
    password: {
      env: 'MAILER_PASSWORD',
      format: String,
      sensitive: true,
      default: null,
      nullable: true,
    },
    apiKey: {
      env: 'MAILER_API_KEY',
      format: String,
      sensitive: true,
      default: null,
      nullable: true,
    },
    eventApiKey: {
      env: 'MAILER_EVENT_API_KEY',
      format: String,
      sensitive: true,
      default: null,
      nullable: true,
    },
    secure: {
      env: 'MAILER_SECURE',
      format: Boolean,
      default: false,
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
  rateLimit: {
    max: {
      env: 'RATE_LIMIT_MAX',
      format: 'int',
      default: 10_000,
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
