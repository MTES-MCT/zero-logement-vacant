import dotenvx from '@dotenvx/dotenvx';
import { StringValue } from 'ms';
import { z } from 'zod';

import { LOG_LEVELS, LogLevel } from '@zerologementvacant/utils';

dotenvx.config({
  convention: 'nextjs',
  quiet: process.env.NODE_ENV === 'test'
});

const isProduction = process.env.NODE_ENV === 'production';
const isReviewApp = process.env.IS_REVIEW_APP === 'true';

// Treat empty-string env vars the same as unset so Zod defaults kick in.
const e = (key: string): string | undefined => process.env[key] || undefined;

const boolFromString = z.preprocess(
  (val) => val === 'true' || val === true,
  z.boolean()
);

export const configSchema = z.object({
  app: z.object({
    batchSize: z.coerce.number().int().default(1_000),
    env: z.enum(['development', 'test', 'production']).default('development'),
    isReviewApp: boolFromString.default(false),
    host: z.string().default('http://localhost:3001'),
    port: z.coerce.number().int().min(1).max(65535).default(3001),
    system: z.string().default('admin@zerologementvacant.beta.gouv.fr')
  }),
  auth: z.object({
    secret: z.string().min(1),
    expiresIn: z.string().default('12 hours'),
    admin2faEnabled: boolFromString.default(false)
  }),
  ban: z.object({
    api: z.object({
      endpoint: z.string().url().default('https://api-adresse.data.gouv.fr')
    }),
    update: z.object({
      pageSize: z.coerce.number().int().default(2_000),
      delay: z.string().default('1 months')
    })
  }),
  clamav: z.object({
    enabled: boolFromString.default(false),
    socket: z.string().default('/var/run/clamav/clamd.sock'),
    host: z.string().default('127.0.0.1'),
    port: z.coerce.number().int().min(1).max(65535).default(3310),
    binPath: z.string().default('/usr/bin/clamdscan'),
    configFile: z.string().default('/etc/clamav/clamd.conf')
  }),
  cerema: z.object({
    enabled: boolFromString.default(isProduction),
    api: z.string().url().default('https://getdf.cerema.fr'),
    username: z.string().nullable().default(null),
    password: z.string().nullable().default(null),
    authVersion: z.enum(['v1', 'v2']).default('v1'),
    apiV2: z
      .string()
      .url()
      .default('https://datafoncier-dev.osc-fr1.scalingo.io')
  }),
  datafoncier: z.object({
    api: z.string().default('https://apidf-preprod.cerema.fr'),
    enabled: boolFromString.default(false),
    token: z.string().nullable().default(null)
  }),
  db: z.object({
    env: z
      .enum(['development', 'test', 'production'])
      .default(
        (process.env.NODE_ENV as
          | 'development'
          | 'test'
          | 'production'
          | undefined) ?? 'development'
      ),
    url: z.string().min(1),
    pool: z.object({
      max: z.coerce.number().int().default(10)
    })
  }),
  elastic: z.object({
    env: z
      .enum(['development', 'test', 'production'])
      .default(
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
    email: z.string().email().nullable().default(null),
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
  mailer: z.object({
    from: z.string().default('contact@zerologementvacant.beta.gouv.fr'),
    provider: z.enum(['brevo', 'nodemailer']).default('nodemailer'),
    host: z.string().nullable().default(null),
    port: z.coerce.number().int().min(1).max(65535).nullable().default(null),
    user: z.string().nullable().default(null),
    password: z.string().nullable().default(null),
    apiKey: z.string().nullable().default(null),
    eventApiKey: z.string().nullable().default(null),
    secure: boolFromString.default(false)
  }),
  metabase: z.object({
    domain: z.string().url().nullable().default(null),
    token: z.string().nullable().default(null),
    apiToken: z.string().nullable().default(null)
  }),
  rateLimit: z.object({
    max: z.coerce.number().int().default(10_000)
  }),
  redis: z.object({
    url: z.string().min(1)
  }),
  s3: z.object({
    endpoint: z.string().min(1),
    region: z.string().min(1),
    bucket: z.string().default('zerologementvacant'),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1)
  }),
  posthog: z.object({
    apiKey: z.string().min(1),
    host: z.string().default('https://eu.i.posthog.com')
  }),
  sentry: z.object({
    dsn: z.string().nullable().default(null),
    enabled: boolFromString.default(isProduction)
  }),
  swagger: z.object({
    enabled: z.stringbool()
  })
});

export type Config = z.infer<typeof configSchema>;

export type Env = 'development' | 'test' | 'production';

const config = configSchema.parse({
  app: {
    batchSize: e('BATCH_SIZE'),
    env: e('NODE_ENV'),
    isReviewApp: e('IS_REVIEW_APP'),
    host: e('HOST'),
    port: e('PORT'),
    system: e('SYSTEM_ACCOUNT')
  },
  auth: {
    secret: e('AUTH_SECRET') ?? (isProduction ? undefined : 'secret'),
    expiresIn: e('AUTH_EXPIRES_IN'),
    admin2faEnabled: e('ADMIN_2FA_ENABLED')
  },
  ban: {
    api: { endpoint: e('BAN_API_ENDPOINT') },
    update: {
      pageSize: e('BAN_UPDATE_PAGE_SIZE'),
      delay: e('BAN_UPDATE_DELAY')
    }
  },
  clamav: {
    enabled: e('CLAMAV_ENABLED'),
    socket: e('CLAMAV_SOCKET'),
    host: e('CLAMAV_HOST'),
    port: e('CLAMAV_PORT'),
    binPath: e('CLAMAV_BIN_PATH'),
    configFile: e('CLAMAV_CONFIG_FILE')
  },
  cerema: {
    enabled: e('CEREMA_ENABLED'),
    api: e('CEREMA_API'),
    username: e('CEREMA_USERNAME') ?? null,
    password: e('CEREMA_PASSWORD') ?? null,
    authVersion: e('CEREMA_AUTH_VERSION'),
    apiV2: e('CEREMA_API_V2')
  },
  datafoncier: {
    api: e('DATAFONCIER_API'),
    enabled: e('DATAFONCIER_ENABLED'),
    token: e('DATAFONCIER_TOKEN') ?? null
  },
  db: {
    env: e('DATABASE_ENV'),
    url:
      e('DATABASE_URL') ??
      (isProduction
        ? undefined
        : 'postgresql://postgres:postgres@localhost:5432/zlv'),
    pool: { max: e('DATABASE_POOL_MAX') }
  },
  elastic: {
    env: e('ELASTIC_ENV'),
    node: e('ELASTIC_NODE'),
    auth: {
      username: e('ELASTIC_USERNAME'),
      password: e('ELASTIC_PASSWORD')
    }
  },
  e2e: {
    email: e('E2E_EMAIL') ?? null,
    password: e('E2E_PASSWORD') ?? null
  },
  upload: {
    maxSizeMB: e('FILE_UPLOAD_MAX_SIZE_MB'),
    geo: {
      maxSizeMB: e('GEO_UPLOAD_MAX_SIZE_MB'),
      maxShapefileFeatures: e('MAX_SHAPEFILE_FEATURES')
    }
  },
  log: {
    level: e('LOG_LEVEL')
  },
  mailer: {
    from: e('MAIL_FROM'),
    provider: e('MAILER_PROVIDER'),
    host: e('MAILER_HOST') ?? null,
    port: e('MAILER_PORT') ?? null,
    user: e('MAILER_USER') ?? null,
    password: e('MAILER_PASSWORD') ?? null,
    apiKey: e('MAILER_API_KEY') ?? null,
    eventApiKey: e('MAILER_EVENT_API_KEY') ?? null,
    secure: e('MAILER_SECURE')
  },
  metabase: {
    domain: e('METABASE_DOMAIN') ?? null,
    token: e('METABASE_TOKEN') ?? (isProduction ? undefined : null),
    apiToken: e('METABASE_API_TOKEN') ?? (isProduction ? undefined : null)
  },
  rateLimit: {
    max: e('RATE_LIMIT_MAX')
  },
  redis: {
    url: e('REDIS_URL') ?? (isProduction ? undefined : 'redis://localhost:6379')
  },
  s3: {
    endpoint:
      e('S3_ENDPOINT') ?? (isProduction ? undefined : 'http://localhost:9090'),
    region: e('S3_REGION') ?? (isProduction ? undefined : 'whatever'),
    bucket: e('S3_BUCKET'),
    accessKeyId: e('S3_ACCESS_KEY_ID') ?? (isProduction ? undefined : 'key'),
    secretAccessKey:
      e('S3_SECRET_ACCESS_KEY') ?? (isProduction ? undefined : 'secret')
  },
  posthog: {
    apiKey: e('POSTHOG_API_KEY') ?? (isProduction ? undefined : 'secret'),
    host: e('POSTHOG_HOST')
  },
  sentry: {
    dsn: e('SENTRY_DSN') ?? null,
    enabled: e('SENTRY_ENABLED')
  },
  swagger: {
    enabled: e('SWAGGER_ENABLED')
  }
});

// Cast to match the contract expected by the rest of the codebase:
// - auth.expiresIn typed as ms StringValue
// - metabase.token / apiToken typed as string (required in production; null only in dev)
export default config as Omit<Config, 'auth' | 'metabase'> & {
  auth: Omit<Config['auth'], 'expiresIn'> & { expiresIn: StringValue };
  metabase: { domain: string; token: string; apiToken: string };
};
