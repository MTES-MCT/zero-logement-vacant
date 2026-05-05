# convict → Zod Config Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `convict` with a plain Zod schema in `server/src/infra/config.ts` only, eliminating the separate `Config` interface and enabling native Zod conditional validation.

**Architecture:** A Zod schema defines types and constraints, a `raw` object maps `process.env.*` values (with conditional non-production defaults inline), and `schema.parse(raw)` produces the typed config. No wrapper library.

**Tech Stack:** Zod 4 (`zod@4.3.6`, already in `server`), `@dotenvx/dotenvx` (unchanged), `@zerologementvacant/utils` (LogLevel enum).

---

## File Map

| File | Action |
|---|---|
| `server/src/infra/config.ts` | Rewrite — replace convict schema with Zod |
| `server/src/infra/config.test.ts` | Create — new tests |
| `server/package.json` | Remove `convict`, `convict-format-with-validator`, `@types/convict`, `@types/convict-format-with-validator` |

---

## Shared Conventions (apply in every task)

**`boolFromString` helper** — used for env vars that are `"true"` / `"false"` strings:
```ts
const boolFromString = z.preprocess(
  (val) => val === 'true' || val === true,
  z.boolean()
);
```

**Conditional defaults pattern** — for fields required in production but with a dev fallback, put the conditional in the raw input, not the schema:
```ts
// raw input
secret: process.env.AUTH_SECRET ?? (isProduction ? undefined : 'secret'),
// schema — just required string
secret: z.string().min(1),
```

**Nullable optional fields** — for fields that are genuinely optional everywhere:
```ts
// raw input
dsn: process.env.SENTRY_DSN ?? null,
// schema
dsn: z.string().nullable().default(null),
```

---

## Task 1: Create worktree

- [ ] **Step 1: Create the feature branch and worktree**

```bash
wt switch --create refactor/convict-to-zod -y
```

---

## Task 2: Write failing tests — server config

**Files:**
- Create: `server/src/infra/config.test.ts`

- [ ] **Step 1: Create the test file**

```ts
// server/src/infra/config.test.ts
import { describe, expect, it } from 'vitest';

// We test the schema directly, not the exported singleton.
// Import the schema once it is exported in Task 3.
import { configSchema } from './config';

describe('configSchema', () => {
  it('parses a minimal valid config', () => {
    const result = configSchema.parse({
      app: {
        batchSize: '500',
        env: 'test',
        isReviewApp: 'false',
        host: 'http://localhost:3001',
        port: '3001',
        system: 'admin@example.com',
      },
      auth: {
        secret: 'mysecret',
        expiresIn: '1 hour',
        admin2faEnabled: 'false',
      },
      ban: {
        api: { endpoint: 'https://api-adresse.data.gouv.fr' },
        update: { pageSize: '2000', delay: '1 months' },
      },
      clamav: {
        enabled: 'false',
        socket: '/var/run/clamav/clamd.sock',
        host: '127.0.0.1',
        port: '3310',
        binPath: '/usr/bin/clamdscan',
        configFile: '/etc/clamav/clamd.conf',
      },
      cerema: {
        enabled: 'false',
        api: 'https://getdf.cerema.fr',
        username: null,
        password: null,
        authVersion: 'v1',
        apiV2: 'https://datafoncier-dev.osc-fr1.scalingo.io',
      },
      datafoncier: {
        api: 'https://apidf-preprod.cerema.fr',
        enabled: 'false',
        token: null,
      },
      db: {
        env: 'test',
        url: 'postgresql://postgres:postgres@localhost:5432/test',
        pool: { max: '10' },
      },
      elastic: {
        env: 'test',
        node: '',
        auth: { username: '', password: '' },
      },
      e2e: { email: null, password: null },
      upload: {
        maxSizeMB: '5',
        geo: { maxSizeMB: '100', maxShapefileFeatures: '10000' },
      },
      log: { level: 'info' },
      mailer: {
        from: 'contact@zerologementvacant.beta.gouv.fr',
        provider: 'nodemailer',
        host: null,
        port: null,
        user: null,
        password: null,
        apiKey: null,
        eventApiKey: null,
        secure: 'false',
      },
      metabase: { domain: null, token: null, apiToken: null },
      rateLimit: { max: '10000' },
      redis: { url: 'redis://localhost:6379' },
      s3: {
        endpoint: 'http://localhost:9090',
        region: 'us-east-1',
        bucket: 'zerologementvacant',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
      },
      posthog: { apiKey: 'secret', host: 'https://eu.i.posthog.com' },
      sentry: { dsn: null, enabled: 'false' },
    });

    expect(result.app.batchSize).toBe(500);        // coerced string → number
    expect(result.app.isReviewApp).toBe(false);     // coerced "false" → boolean
    expect(result.db.url).toBe('postgresql://postgres:postgres@localhost:5432/test');
    expect(result.cerema.username).toBeNull();
    expect(result.log.level).toBe('info');
  });

  it('coerces "true" string to boolean true', () => {
    const result = configSchema.parse({
      // ... (spread minimal valid config above, override clamav.enabled)
      app: { batchSize: '1000', env: 'test', isReviewApp: 'true', host: 'http://localhost:3001', port: '3001', system: 'a@b.com' },
      auth: { secret: 's', expiresIn: '1h', admin2faEnabled: 'false' },
      ban: { api: { endpoint: 'https://api-adresse.data.gouv.fr' }, update: { pageSize: '2000', delay: '1 months' } },
      clamav: { enabled: 'true', socket: '/s', host: '127.0.0.1', port: '3310', binPath: '/b', configFile: '/c' },
      cerema: { enabled: 'false', api: 'https://getdf.cerema.fr', username: null, password: null, authVersion: 'v1', apiV2: 'https://datafoncier-dev.osc-fr1.scalingo.io' },
      datafoncier: { api: 'https://apidf-preprod.cerema.fr', enabled: 'false', token: null },
      db: { env: 'test', url: 'postgresql://localhost/test', pool: { max: '10' } },
      elastic: { env: 'test', node: '', auth: { username: '', password: '' } },
      e2e: { email: null, password: null },
      upload: { maxSizeMB: '5', geo: { maxSizeMB: '100', maxShapefileFeatures: '10000' } },
      log: { level: 'debug' },
      mailer: { from: 'a@b.com', provider: 'nodemailer', host: null, port: null, user: null, password: null, apiKey: null, eventApiKey: null, secure: 'false' },
      metabase: { domain: null, token: null, apiToken: null },
      rateLimit: { max: '10000' },
      redis: { url: 'redis://localhost:6379' },
      s3: { endpoint: 'http://localhost:9090', region: 'r', bucket: 'b', accessKeyId: 'k', secretAccessKey: 's' },
      posthog: { apiKey: 'k', host: 'https://eu.i.posthog.com' },
      sentry: { dsn: null, enabled: 'false' },
    });

    expect(result.app.isReviewApp).toBe(true);
    expect(result.clamav.enabled).toBe(true);
  });

  it('rejects an invalid log level', () => {
    expect(() =>
      configSchema.parse({
        app: { batchSize: '1000', env: 'test', isReviewApp: 'false', host: 'http://localhost:3001', port: '3001', system: 'a@b.com' },
        auth: { secret: 's', expiresIn: '1h', admin2faEnabled: 'false' },
        ban: { api: { endpoint: 'https://api-adresse.data.gouv.fr' }, update: { pageSize: '2000', delay: '1 months' } },
        clamav: { enabled: 'false', socket: '/s', host: '127.0.0.1', port: '3310', binPath: '/b', configFile: '/c' },
        cerema: { enabled: 'false', api: 'https://getdf.cerema.fr', username: null, password: null, authVersion: 'v1', apiV2: 'https://datafoncier-dev.osc-fr1.scalingo.io' },
        datafoncier: { api: 'https://apidf-preprod.cerema.fr', enabled: 'false', token: null },
        db: { env: 'test', url: 'postgresql://localhost/test', pool: { max: '10' } },
        elastic: { env: 'test', node: '', auth: { username: '', password: '' } },
        e2e: { email: null, password: null },
        upload: { maxSizeMB: '5', geo: { maxSizeMB: '100', maxShapefileFeatures: '10000' } },
        log: { level: 'verbose' }, // invalid
        mailer: { from: 'a@b.com', provider: 'nodemailer', host: null, port: null, user: null, password: null, apiKey: null, eventApiKey: null, secure: 'false' },
        metabase: { domain: null, token: null, apiToken: null },
        rateLimit: { max: '10000' },
        redis: { url: 'redis://localhost:6379' },
        s3: { endpoint: 'http://localhost:9090', region: 'r', bucket: 'b', accessKeyId: 'k', secretAccessKey: 's' },
        posthog: { apiKey: 'k', host: 'https://eu.i.posthog.com' },
        sentry: { dsn: null, enabled: 'false' },
      })
    ).toThrow();
  });

  it('rejects an invalid cerema authVersion', () => {
    expect(() =>
      configSchema.shape.cerema.parse({ enabled: 'false', api: 'https://getdf.cerema.fr', username: null, password: null, authVersion: 'v3', apiV2: 'https://datafoncier-dev.osc-fr1.scalingo.io' })
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests — verify they fail with import error**

```bash
yarn nx test server -- src/infra/config.test.ts
```

Expected: FAIL — `configSchema` is not exported yet.

---

## Task 3: Migrate server config

**Files:**
- Modify: `server/src/infra/config.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import dotenvx from '@dotenvx/dotenvx';
import path from 'node:path';
import { z } from 'zod';
import { StringValue } from 'ms';

import { LOG_LEVELS, LogLevel } from '@zerologementvacant/utils';

const fromProjectRoot = (...paths: ReadonlyArray<string>): string =>
  path.resolve(import.meta.dirname, '../..', ...paths);

dotenvx.config({
  convention: 'nextjs',
  path: [
    fromProjectRoot(`.env.${process.env.NODE_ENV}`),
    fromProjectRoot('.env'),
  ],
  quiet: process.env.NODE_ENV === 'test',
});

const isProduction = process.env.NODE_ENV === 'production';

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
    system: z.string().default('admin@zerologementvacant.beta.gouv.fr'),
  }),
  auth: z.object({
    secret: z.string().min(1),
    expiresIn: z.string().default('12 hours'),
    admin2faEnabled: boolFromString.default(false),
  }),
  ban: z.object({
    api: z.object({
      endpoint: z.string().url().default('https://api-adresse.data.gouv.fr'),
    }),
    update: z.object({
      pageSize: z.coerce.number().int().default(2_000),
      delay: z.string().default('1 months'),
    }),
  }),
  clamav: z.object({
    enabled: boolFromString.default(false),
    socket: z.string().default('/var/run/clamav/clamd.sock'),
    host: z.string().default('127.0.0.1'),
    port: z.coerce.number().int().min(1).max(65535).default(3310),
    binPath: z.string().default('/usr/bin/clamdscan'),
    configFile: z.string().default('/etc/clamav/clamd.conf'),
  }),
  cerema: z.object({
    enabled: boolFromString.default(isProduction),
    api: z.string().url().default('https://getdf.cerema.fr'),
    username: z.string().nullable().default(null),
    password: z.string().nullable().default(null),
    authVersion: z.enum(['v1', 'v2']).default('v1'),
    apiV2: z.string().url().default('https://datafoncier-dev.osc-fr1.scalingo.io'),
  }),
  datafoncier: z.object({
    api: z.string().default('https://apidf-preprod.cerema.fr'),
    enabled: boolFromString.default(false),
    token: z.string().nullable().default(null),
  }),
  db: z.object({
    env: z.enum(['development', 'test', 'production']).default(
      (process.env.NODE_ENV as 'development' | 'test' | 'production' | undefined) ?? 'development'
    ),
    url: z.string().min(1),
    pool: z.object({
      max: z.coerce.number().int().default(10),
    }),
  }),
  elastic: z.object({
    env: z.enum(['development', 'test', 'production']).default(
      (process.env.NODE_ENV as 'development' | 'test' | 'production' | undefined) ?? 'development'
    ),
    node: z.string().default(''),
    auth: z.object({
      username: z.string().default(''),
      password: z.string().default(''),
    }),
  }),
  e2e: z.object({
    email: z.string().email().nullable().default(null),
    password: z.string().nullable().default(null),
  }),
  upload: z.object({
    maxSizeMB: z.coerce.number().int().default(5),
    geo: z.object({
      maxSizeMB: z.coerce.number().int().default(100),
      maxShapefileFeatures: z.coerce.number().int().default(10_000),
    }),
  }),
  log: z.object({
    level: z.enum(LOG_LEVELS as [LogLevel, ...LogLevel[]]).default(LogLevel.INFO),
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
    secure: boolFromString.default(false),
  }),
  metabase: z.object({
    domain: z.string().url().nullable().default(null),
    token: z.string().nullable().default(null),
    apiToken: z.string().nullable().default(null),
  }),
  rateLimit: z.object({
    max: z.coerce.number().int().default(10_000),
  }),
  redis: z.object({
    url: z.string().min(1),
  }),
  s3: z.object({
    endpoint: z.string().min(1),
    region: z.string().min(1),
    bucket: z.string().default('zerologementvacant'),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
  }),
  posthog: z.object({
    apiKey: z.string().min(1),
    host: z.string().default('https://eu.i.posthog.com'),
  }),
  sentry: z.object({
    dsn: z.string().nullable().default(null),
    enabled: boolFromString.default(isProduction),
  }),
});

export type Config = z.infer<typeof configSchema>;

const config = configSchema.parse({
  app: {
    batchSize: process.env.BATCH_SIZE,
    env: process.env.NODE_ENV,
    isReviewApp: process.env.IS_REVIEW_APP,
    host: process.env.HOST,
    port: process.env.PORT,
    system: process.env.SYSTEM_ACCOUNT,
  },
  auth: {
    secret: process.env.AUTH_SECRET ?? (isProduction ? undefined : 'secret'),
    expiresIn: process.env.AUTH_EXPIRES_IN,
    admin2faEnabled: process.env.ADMIN_2FA_ENABLED,
  },
  ban: {
    api: { endpoint: process.env.BAN_API_ENDPOINT },
    update: {
      pageSize: process.env.BAN_UPDATE_PAGE_SIZE,
      delay: process.env.BAN_UPDATE_DELAY,
    },
  },
  clamav: {
    enabled: process.env.CLAMAV_ENABLED,
    socket: process.env.CLAMAV_SOCKET,
    host: process.env.CLAMAV_HOST,
    port: process.env.CLAMAV_PORT,
    binPath: process.env.CLAMAV_BIN_PATH,
    configFile: process.env.CLAMAV_CONFIG_FILE,
  },
  cerema: {
    enabled: process.env.CEREMA_ENABLED,
    api: process.env.CEREMA_API,
    username: process.env.CEREMA_USERNAME ?? null,
    password: process.env.CEREMA_PASSWORD ?? null,
    authVersion: process.env.CEREMA_AUTH_VERSION,
    apiV2: process.env.CEREMA_API_V2,
  },
  datafoncier: {
    api: process.env.DATAFONCIER_API,
    enabled: process.env.DATAFONCIER_ENABLED,
    token: process.env.DATAFONCIER_TOKEN ?? null,
  },
  db: {
    env: process.env.DATABASE_ENV,
    url: process.env.DATABASE_URL ?? (isProduction ? undefined : 'postgresql://postgres:postgres@localhost:5432/zlv'),
    pool: { max: process.env.DATABASE_POOL_MAX },
  },
  elastic: {
    env: process.env.ELASTIC_ENV,
    node: process.env.ELASTIC_NODE,
    auth: {
      username: process.env.ELASTIC_USERNAME,
      password: process.env.ELASTIC_PASSWORD,
    },
  },
  e2e: {
    email: process.env.E2E_EMAIL ?? null,
    password: process.env.E2E_PASSWORD ?? null,
  },
  upload: {
    maxSizeMB: process.env.FILE_UPLOAD_MAX_SIZE_MB,
    geo: {
      maxSizeMB: process.env.GEO_UPLOAD_MAX_SIZE_MB,
      maxShapefileFeatures: process.env.MAX_SHAPEFILE_FEATURES,
    },
  },
  log: {
    level: process.env.LOG_LEVEL,
  },
  mailer: {
    from: process.env.MAIL_FROM,
    provider: process.env.MAILER_PROVIDER,
    host: process.env.MAILER_HOST ?? null,
    port: process.env.MAILER_PORT ?? null,
    user: process.env.MAILER_USER ?? null,
    password: process.env.MAILER_PASSWORD ?? null,
    apiKey: process.env.MAILER_API_KEY ?? null,
    eventApiKey: process.env.MAILER_EVENT_API_KEY ?? null,
    secure: process.env.MAILER_SECURE,
  },
  metabase: {
    domain: process.env.METABASE_DOMAIN ?? null,
    token: process.env.METABASE_TOKEN ?? (isProduction ? undefined : null),
    apiToken: process.env.METABASE_API_TOKEN ?? (isProduction ? undefined : null),
  },
  rateLimit: {
    max: process.env.RATE_LIMIT_MAX,
  },
  redis: {
    url: process.env.REDIS_URL ?? (isProduction ? undefined : 'redis://localhost:6379'),
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? (isProduction ? undefined : 'http://localhost:9090'),
    region: process.env.S3_REGION ?? (isProduction ? undefined : 'whatever'),
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? (isProduction ? undefined : 'key'),
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? (isProduction ? undefined : 'secret'),
  },
  posthog: {
    apiKey: process.env.POSTHOG_API_KEY ?? (isProduction ? undefined : 'secret'),
    host: process.env.POSTHOG_HOST,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN ?? null,
    enabled: process.env.SENTRY_ENABLED,
  },
});

// Re-export auth.expiresIn with correct type (ms StringValue)
export default config as Omit<Config, 'auth'> & {
  auth: Omit<Config['auth'], 'expiresIn'> & { expiresIn: StringValue };
};
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
yarn nx test server -- src/infra/config.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Run typecheck**

```bash
yarn nx typecheck server
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/infra/config.ts server/src/infra/config.test.ts
git commit -m "refactor(server): replace convict with Zod in config"
```

---

## Task 4: Remove convict from server

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Remove convict packages**

```bash
yarn workspace @zerologementvacant/server remove convict convict-format-with-validator
yarn workspace @zerologementvacant/server remove --dev @types/convict @types/convict-format-with-validator
```

- [ ] **Step 2: Verify no remaining convict references in server**

```bash
grep -r "convict" server/ --include="*.ts" --include="*.json"
```

Expected: no output.

- [ ] **Step 3: Run server tests and typecheck**

```bash
yarn nx test server
yarn nx typecheck server
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add server/package.json yarn.lock
git commit -m "chore(server): remove convict dependency"
```

---

## Self-Review

**Spec coverage:**
- ✅ server config migrated with tests
- ✅ convict removed from server only
- ✅ `Config` interface derived via `z.infer` — no manual interface
- ✅ Conditional logic via `isProduction` in raw input
- ✅ `boolFromString` replaces `strict-boolean` custom format
- ✅ `z.coerce.number().int()` replaces `format: 'int'`
- ✅ `z.string().url()` / `.email()` replace `convict-format-with-validator` formats

**Type note on `auth.expiresIn`:** The `ms` library's `StringValue` is a template literal type. Since Zod returns `string`, the server export re-casts with `as` to preserve the downstream type contract. This is a safe cast since `StringValue` is just a branded string.
