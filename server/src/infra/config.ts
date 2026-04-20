import dotenvx from '@dotenvx/dotenvx';
import { StringValue } from 'ms';
import { z } from 'zod';

import { LOG_LEVELS, LogLevel } from '@zerologementvacant/utils';

dotenvx.config({
  convention: 'nextjs',
  quiet: process.env.NODE_ENV === 'test'
});

// Treat empty-string env vars the same as unset so Zod defaults kick in.
const env = (key: string): string | undefined => process.env[key] || undefined;

const envEnum = z
  .literal(['development', 'test', 'production'])
  .default('development');
const isProduction = envEnum.parse(process.env.NODE_ENV) === 'production';

export const configSchema = z.object({
  app: z.object({
    batchSize: z.coerce.number().int().default(1_000),
    env: envEnum.default('development'),
    isReviewApp: z.stringbool().default(false),
    host: z.string().default('http://localhost:3001'),
    port: z.coerce.number().int().min(1).max(65535).default(3001),
    system: z.string().default('admin@zerologementvacant.beta.gouv.fr')
  }),
  auth: z.object({
    secret: z
      .string()
      .min(1)
      .prefault(isProduction ? '' : 'secret'),
    expiresIn: z.string().default('12 hours'),
    admin2faEnabled: z.stringbool().default(false)
  }),
  ban: z.object({
    api: z.object({
      endpoint: z.url().default('https://api-adresse.data.gouv.fr')
    }),
    update: z.object({
      pageSize: z.coerce.number().int().default(2_000),
      delay: z.string().default('1 months')
    })
  }),
  clamav: z.object({
    enabled: z.stringbool().default(false),
    socket: z.string().default('/var/run/clamav/clamd.sock'),
    host: z.string().default('127.0.0.1'),
    port: z.coerce.number().int().min(1).max(65535).default(3310),
    binPath: z.string().default('/usr/bin/clamdscan'),
    configFile: z.string().default('/etc/clamav/clamd.conf')
  }),
  cerema: z
    .object({
      enabled: z.stringbool().default(isProduction),
      api: z.url().default('https://getdf.cerema.fr'),
      username: z.string().nullable().default(null),
      password: z.string().nullable().default(null),
      authVersion: z.literal(['v1', 'v2']).default('v1'),
      apiV2: z.url().default('https://datafoncier-dev.osc-fr1.scalingo.io')
    })
    .superRefine((val, ctx) => {
      if (val.enabled) {
        if (!val.username) {
          ctx.addIssue({
            code: 'custom',
            path: ['username'],
            message: 'Required when cerema.enabled is true'
          });
        }
        if (!val.password) {
          ctx.addIssue({
            code: 'custom',
            path: ['password'],
            message: 'Required when cerema.enabled is true'
          });
        }
      }
    }),
  datafoncier: z
    .object({
      api: z.string().default('https://apidf-preprod.cerema.fr'),
      enabled: z.stringbool().default(false),
      token: z.string().nullable().default(null)
    })
    .superRefine((val, ctx) => {
      if (val.enabled && !val.token) {
        ctx.addIssue({
          code: 'custom',
          path: ['token'],
          message: 'Required when datafoncier.enabled is true'
        });
      }
    }),
  db: z.object({
    env: envEnum.default(
      (process.env.NODE_ENV as
        | 'development'
        | 'test'
        | 'production'
        | undefined) ?? 'development'
    ),
    url: z
      .string()
      .min(1)
      .prefault(
        isProduction ? '' : 'postgresql://postgres:postgres@localhost:5432/dev'
      ),
    pool: z.object({
      max: z.coerce.number().int().default(10)
    })
  }),
  elastic: z.object({
    env: envEnum.default(
      (process.env.NODE_ENV as
        | 'development'
        | 'test'
        | 'production'
        | undefined) ?? 'development'
    ),
    node: z.string().default(''),
    auth: z.object({
      username: z.string().default(''),
      password: z.string().default('')
    })
  }),
  e2e: z.object({
    email: z.email().nullable().default(null),
    password: z.string().nullable().default(null)
  }),
  upload: z.object({
    maxSizeMB: z.coerce.number().int().default(5),
    geo: z.object({
      maxSizeMB: z.coerce.number().int().default(100),
      maxShapefileFeatures: z.coerce.number().int().default(10_000)
    })
  }),
  log: z.object({
    level: z
      .enum(LOG_LEVELS as [LogLevel, ...LogLevel[]])
      .default(LogLevel.INFO)
  }),
  mailer: z.discriminatedUnion('provider', [
    z.object({
      from: z.string().default('contact@zerologementvacant.beta.gouv.fr'),
      provider: z.literal('brevo'),
      host: z.string().nullable().default(null),
      port: z.coerce.number().int().min(1).max(65535).nullable().default(null),
      user: z.string().nullable().default(null),
      password: z.string().nullable().default(null),
      apiKey: z.string(),
      eventApiKey: z.string().nullable().default(null),
      secure: z.stringbool().default(false)
    }),
    z.object({
      from: z.string().default('contact@zerologementvacant.beta.gouv.fr'),
      provider: z.literal('nodemailer'),
      host: z.string().nullable().default(null),
      port: z.coerce.number().int().min(1).max(65535).nullable().default(null),
      user: z.string().nullable().default(null),
      password: z.string().nullable().default(null),
      apiKey: z.string().nullable().default(null),
      eventApiKey: z.string().nullable().default(null),
      secure: z.stringbool().default(false)
    })
  ]),
  metabase: z.object({
    domain: z.url().nullable().default(null),
    token: z.string().nullable().default(null),
    apiToken: z.string().nullable().default(null)
  }),
  rateLimit: z.object({
    max: z.coerce.number().int().default(10_000)
  }),
  redis: z.object({
    url: z
      .string()
      .min(1)
      .prefault(isProduction ? '' : 'redis://localhost:6379')
  }),
  s3: z.object({
    endpoint: z
      .string()
      .min(1)
      .prefault(isProduction ? '' : 'http://localhost:9090'),
    region: z
      .string()
      .min(1)
      .prefault(isProduction ? '' : 'whatever'),
    bucket: z.string().default('zerologementvacant'),
    accessKeyId: z
      .string()
      .min(1)
      .prefault(isProduction ? '' : 'key'),
    secretAccessKey: z
      .string()
      .min(1)
      .prefault(isProduction ? '' : 'secret')
  }),
  posthog: z
    .object({
      enabled: z.stringbool().default(isProduction),
      apiKey: z.string().default(''),
      host: z.string().default('https://eu.i.posthog.com')
    })
    .superRefine((val, ctx) => {
      if (val.enabled && !val.apiKey) {
        ctx.addIssue({
          code: 'custom',
          path: ['apiKey'],
          message: 'Required when posthog.enabled is true'
        });
      }
    }),
  sentry: z
    .object({
      dsn: z.string().nullable().default(null),
      enabled: z.stringbool().default(isProduction)
    })
    .superRefine((val, ctx) => {
      if (val.enabled && !val.dsn) {
        ctx.addIssue({
          code: 'custom',
          path: ['dsn'],
          message: 'Required when sentry.enabled is true'
        });
      }
    }),
  swagger: z.object({
    enabled: z.stringbool().default(true)
  })
});

export type Config = z.infer<typeof configSchema>;

export type Env = 'development' | 'test' | 'production';

const config = configSchema.parse({
  app: {
    batchSize: env('BATCH_SIZE'),
    env: env('NODE_ENV'),
    isReviewApp: env('IS_REVIEW_APP'),
    host: env('HOST'),
    port: env('PORT'),
    system: env('SYSTEM_ACCOUNT')
  },
  auth: {
    secret: env('AUTH_SECRET'),
    expiresIn: env('AUTH_EXPIRES_IN'),
    admin2faEnabled: env('ADMIN_2FA_ENABLED')
  },
  ban: {
    api: { endpoint: env('BAN_API_ENDPOINT') },
    update: {
      pageSize: env('BAN_UPDATE_PAGE_SIZE'),
      delay: env('BAN_UPDATE_DELAY')
    }
  },
  clamav: {
    enabled: env('CLAMAV_ENABLED'),
    socket: env('CLAMAV_SOCKET'),
    host: env('CLAMAV_HOST'),
    port: env('CLAMAV_PORT'),
    binPath: env('CLAMAV_BIN_PATH'),
    configFile: env('CLAMAV_CONFIG_FILE')
  },
  cerema: {
    enabled: env('CEREMA_ENABLED'),
    api: env('CEREMA_API'),
    username: env('CEREMA_USERNAME'),
    password: env('CEREMA_PASSWORD'),
    authVersion: env('CEREMA_AUTH_VERSION'),
    apiV2: env('CEREMA_API_V2')
  },
  datafoncier: {
    api: env('DATAFONCIER_API'),
    enabled: env('DATAFONCIER_ENABLED'),
    token: env('DATAFONCIER_TOKEN')
  },
  db: {
    env: env('DATABASE_ENV'),
    url: env('DATABASE_URL'),
    pool: { max: env('DATABASE_POOL_MAX') }
  },
  elastic: {
    env: env('ELASTIC_ENV'),
    node: env('ELASTIC_NODE'),
    auth: {
      username: env('ELASTIC_USERNAME'),
      password: env('ELASTIC_PASSWORD')
    }
  },
  e2e: {
    email: env('E2E_EMAIL'),
    password: env('E2E_PASSWORD')
  },
  upload: {
    maxSizeMB: env('FILE_UPLOAD_MAX_SIZE_MB'),
    geo: {
      maxSizeMB: env('GEO_UPLOAD_MAX_SIZE_MB'),
      maxShapefileFeatures: env('MAX_SHAPEFILE_FEATURES')
    }
  },
  log: {
    level: env('LOG_LEVEL')
  },
  mailer: {
    from: env('MAIL_FROM'),
    provider: env('MAILER_PROVIDER') ?? 'nodemailer',
    host: env('MAILER_HOST'),
    port: env('MAILER_PORT'),
    user: env('MAILER_USER'),
    password: env('MAILER_PASSWORD'),
    apiKey: env('MAILER_API_KEY'),
    eventApiKey: env('MAILER_EVENT_API_KEY'),
    secure: env('MAILER_SECURE')
  },
  metabase: {
    domain: env('METABASE_DOMAIN'),
    token: env('METABASE_TOKEN'),
    apiToken: env('METABASE_API_TOKEN')
  },
  rateLimit: {
    max: env('RATE_LIMIT_MAX')
  },
  redis: {
    url: env('REDIS_URL')
  },
  s3: {
    endpoint: env('S3_ENDPOINT'),
    region: env('S3_REGION'),
    bucket: env('S3_BUCKET'),
    accessKeyId: env('S3_ACCESS_KEY_ID'),
    secretAccessKey: env('S3_SECRET_ACCESS_KEY')
  },
  posthog: {
    enabled: env('POSTHOG_ENABLED'),
    apiKey: env('POSTHOG_API_KEY'),
    host: env('POSTHOG_HOST')
  },
  sentry: {
    dsn: env('SENTRY_DSN'),
    enabled: env('SENTRY_ENABLED')
  },
  swagger: {
    enabled: env('SWAGGER_ENABLED')
  }
});

// Cast to match the contract expected by the rest of the codebase:
// - auth.expiresIn typed as ms StringValue
// - metabase.token / apiToken typed as string (required in production; null only in dev)
export default config as Omit<Config, 'auth' | 'metabase'> & {
  auth: Omit<Config['auth'], 'expiresIn'> & { expiresIn: StringValue };
  metabase: { domain: string; token: string; apiToken: string };
};
