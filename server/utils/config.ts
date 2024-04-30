import convict from 'convict';
import formats from 'convict-format-with-validator';
import dotenv from 'dotenv';
import path from 'path';

import { LOG_LEVELS, LogLevel } from '../../shared/utils/log-level';
import { isProduction } from '../../queue/src/config';

convict.addFormats(formats);

convict.addFormat({
  name: 'strict-boolean',
  validate(val: any) {
    return typeof val === 'string' && val === 'true';
  },
  coerce: (val: string): boolean => val === 'true',
});

const MAIL_PROVIDERS = ['brevo', 'nodemailer'];

convict.addFormat({
  name: 'comma-separated string',
  validate(val: any) {
    return typeof val === 'string';
  },
  coerce(val: string): string[] {
    return val.split(',').map((str) => str.trim());
  },
});

convict.addFormat({
  name: 'mail-provider',
  validate(val: any) {
    return typeof val === 'string' && MAIL_PROVIDERS.includes(val);
  },
});

if (!process.env.API_PORT) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

interface Config {
  application: {
    batchSize: number;
    host: string;
    isReviewApp: boolean;
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
    api: {
      endpoint: string;
      authToken: string;
    };
    enable: boolean;
  };
  databaseEnvironment: string;
  databaseUrl: string;
  databaseUrlTest: string;
  database: {
    pool: {
      max: number;
    };
  };
  datafoncier: {
    api: string;
    enabled: boolean;
    token: string | null;
  };
  environment: string;
  feature: {
    occupancy: string[];
  };
  features: {
    enableTestAccounts: boolean;
    dpeExperimentEstablishments: string[];
  };
  log: {
    level: LogLevel;
  };
  mail: {
    from: string;
  };
  mailer: {
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
  maxRate: number;
  metabase: {
    domain: string;
    token: string;
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
  sentry: {
    dsn: string | null;
    enabled: boolean;
  };
  serverPort: number;
}

const config = convict<Config>({
  application: {
    batchSize: {
      env: 'BATCH_SIZE',
      format: Number,
      default: 1_000,
    },
    host: {
      env: 'APPLICATION_HOST',
      format: 'url',
      default: 'http://localhost:3000',
    },
    isReviewApp: {
      env: 'IS_REVIEW_APP',
      format: 'strict-boolean',
      default: false,
    },
    system: {
      env: 'SYSTEM_ACCOUNT',
      format: String,
      default: 'lovac-2023@zerologementvacant.beta.gouv.fr',
    },
  },
  auth: {
    secret: {
      env: 'AUTH_SECRET',
      format: String,
      sensitive: true,
      default: null,
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
        format: Number,
        default: 2000,
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
      endpoint: {
        env: 'CEREMA_API_ENDPOINT',
        format: 'url',
        default: 'https://getdf.cerema.fr',
      },
      authToken: {
        env: 'CEREMA_API_AUTH_TOKEN',
        format: String,
        sensitive: true,
        default: null,
      },
    },
    enable: {
      env: 'CEREMA_ENABLE',
      format: 'strict-boolean',
      default: process.env.NODE_ENV === 'production',
    },
  },
  databaseEnvironment: {
    env: 'DATABASE_ENV',
    format: String,
    default: process.env.NODE_ENV ?? 'development',
  },
  databaseUrl: {
    env: 'DATABASE_URL',
    format: String,
    default: null,
  },
  databaseUrlTest: {
    env: 'DATABASE_URL_TEST',
    format: String,
    default: null,
  },
  database: {
    pool: {
      max: {
        env: 'DATABASE_POOL_MAX',
        format: Number,
        default: 10,
      },
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
  environment: {
    env: 'NODE_ENV',
    format: String,
    default: 'development',
  },
  feature: {
    occupancy: {
      env: 'REACT_APP_FEATURE_OCCUPANCY',
      format: 'comma-separated string',
      default: [],
    },
  },
  features: {
    enableTestAccounts: {
      env: 'ENABLE_TEST_ACCOUNTS',
      format: 'strict-boolean',
      default: process.env.NODE_ENV !== 'production',
    },
    dpeExperimentEstablishments: {
      env: 'DPE_EXPERIMENT_ESTABLISHMENTS',
      format: 'comma-separated string',
      default: [],
    },
  },
  log: {
    level: {
      env: 'LOG_LEVEL',
      format: LOG_LEVELS,
      default: LogLevel.DEBUG,
    },
  },
  maxRate: {
    env: 'MAX_RATE',
    format: 'int',
    default: 10000,
  },
  mailer: {
    provider: {
      env: 'MAILER_PROVIDER',
      format: 'mail-provider',
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
  mail: {
    from: {
      env: 'MAIL_FROM',
      format: String,
      default: 'contact@zerologementvacant.beta.gouv.fr',
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
      default: '',
      sensitive: true,
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
  sentry: {
    dsn: {
      env: 'SENTRY_DSN',
      format: String,
      default: null,
      nullable: true,
    },
    enabled: {
      env: 'SENTRY_ENABLED',
      format: 'strict-boolean',
      default: process.env.NODE_ENV === 'production',
    },
  },
  serverPort: {
    env: 'API_PORT',
    format: Number,
    default: 3001,
  },
})
  .validate({ allowed: 'strict' })
  .get();

export default config;
