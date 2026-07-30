import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';

// We test the schema directly, not the exported singleton.
import { configSchema } from '../config';

const validRaw = {
  app: {
    batchSize: '500',
    env: 'test',
    isReviewApp: 'false',
    host: 'http://localhost:3001',
    port: '3001',
    system: 'admin@example.com',
    allowedOrigins: 'http://localhost:3000'
  },
  auth: {
    secret: 'mysecret',
    admin2faEnabled: 'false'
  },
  ban: {
    api: { endpoint: 'https://api-adresse.data.gouv.fr' },
    update: { pageSize: '2000', delay: '1 months' }
  },
  cache: {
    default: 10 * 60 * 1000,
    establishment: 5 * 60 * 1000
  },
  clamav: {
    enabled: 'false',
    socket: '/var/run/clamav/clamd.sock',
    host: '127.0.0.1',
    port: '3310',
    binPath: '/usr/bin/clamdscan',
    configFile: '/etc/clamav/clamd.conf'
  },
  cerema: {
    enabled: 'false',
    api: 'https://getdf.cerema.fr',
    username: null,
    password: null,
    authVersion: 'v1',
    apiV2: 'https://datafoncier-dev.osc-fr1.scalingo.io'
  },
  datafoncier: {
    api: 'https://apidf-preprod.cerema.fr',
    enabled: 'false',
    token: null
  },
  db: {
    env: 'test',
    url: 'postgresql://postgres:postgres@localhost:5432/test',
    pool: { max: '10' }
  },
  elastic: {
    env: 'test',
    node: '',
    auth: { username: '', password: '' }
  },
  e2e: { email: null, password: null },
  upload: {
    maxSizeMB: '5',
    geo: { maxSizeMB: '100', maxShapefileFeatures: '10000' }
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
    secure: 'false'
  },
  metabase: {
    domain: 'http://localhost:4000',
    apiToken: 'example-api-token'
  },
  rateLimit: { max: '10000' },
  redis: { url: 'redis://localhost:6379' },
  s3: {
    endpoint: 'http://localhost:9090',
    region: 'us-east-1',
    bucket: 'zerologementvacant',
    accessKeyId: 'key',
    secretAccessKey: 'secret'
  },
  posthog: { enabled: 'false', apiKey: '', host: 'https://eu.i.posthog.com' },
  sentry: { dsn: null, enabled: 'false' },
  swagger: { enabled: 'true' }
};

describe('configSchema', () => {
  it('parses a minimal valid config', () => {
    const result = configSchema.parse(validRaw);

    expect(result.app.batchSize).toBe(500);
    expect(result.app.isReviewApp).toBe(false);
    expect(result.db.url).toBe(
      'postgresql://postgres:postgres@localhost:5432/test'
    );
    expect(result.cerema.username).toBeNull();
    expect(result.log.level).toBe('info');
  });

  it('limits Metabase card queries to two concurrent requests by default', () => {
    const result = configSchema.parse(validRaw);

    expect(result.metabase.maxConcurrentQueries).toBe(2);
  });

  test.prop([
    fc.oneof(
      fc.integer({ max: 0 }),
      fc.integer({ min: 0, max: 100 }).map((value) => value + 0.5)
    )
  ])('rejects invalid Metabase concurrency limits', (maxConcurrentQueries) => {
    expect(() =>
      configSchema.parse({
        ...validRaw,
        metabase: {
          ...validRaw.metabase,
          maxConcurrentQueries: String(maxConcurrentQueries)
        }
      })
    ).toThrow();
  });

  it('normalizes allowed origins before CORS and CSRF checks', () => {
    const result = configSchema.parse({
      ...validRaw,
      app: {
        ...validRaw.app,
        allowedOrigins:
          ' https://staging.example.com/, https://app.example.com/path '
      }
    });

    expect(result.app.allowedOrigins).toEqual([
      'https://staging.example.com',
      'https://app.example.com'
    ]);
  });

  it('coerces "true" string to boolean true', () => {
    const result = configSchema.parse({
      ...validRaw,
      app: { ...validRaw.app, isReviewApp: 'true' },
      clamav: { ...validRaw.clamav, enabled: 'true' }
    });

    expect(result.app.isReviewApp).toBe(true);
    expect(result.clamav.enabled).toBe(true);
  });

  it('rejects an invalid log level', () => {
    expect(() =>
      configSchema.parse({ ...validRaw, log: { level: 'verbose' } })
    ).toThrow();
  });

  it('rejects an invalid cerema authVersion', () => {
    expect(() =>
      configSchema.shape.cerema.parse({
        ...validRaw.cerema,
        authVersion: 'v3'
      })
    ).toThrow();
  });

  it('rejects cerema config when enabled but username/password missing', () => {
    expect(() =>
      configSchema.parse({
        ...validRaw,
        cerema: {
          ...validRaw.cerema,
          enabled: 'true',
          username: null,
          password: null
        }
      })
    ).toThrow(/Required when cerema\.enabled/);
  });

  it('accepts cerema config when enabled and username/password provided', () => {
    expect(() =>
      configSchema.parse({
        ...validRaw,
        cerema: {
          ...validRaw.cerema,
          enabled: 'true',
          username: 'user',
          password: 'pass'
        }
      })
    ).not.toThrow();
  });

  it('rejects datafoncier config when enabled but token missing', () => {
    expect(() =>
      configSchema.parse({
        ...validRaw,
        datafoncier: { ...validRaw.datafoncier, enabled: 'true', token: null }
      })
    ).toThrow(/Required when datafoncier\.enabled/);
  });

  it('rejects sentry config when enabled but dsn missing', () => {
    expect(() =>
      configSchema.parse({
        ...validRaw,
        sentry: { dsn: null, enabled: 'true' }
      })
    ).toThrow(/Required when sentry\.enabled/);
  });

  it('rejects mailer config when provider is brevo but apiKey missing', () => {
    expect(() =>
      configSchema.parse({
        ...validRaw,
        mailer: { ...validRaw.mailer, provider: 'brevo', apiKey: null }
      })
    ).toThrow();
  });
});
