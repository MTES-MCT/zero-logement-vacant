import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

import { z } from 'zod';

/**
 * Env config for the Playwright pilot. Intentionally reads the same
 * CYPRESS_* env vars the existing Cypress suite uses, so the same .env
 * (or CI secret bundle) works for both — see `apps/front-e2e/config.ts`.
 * Rename to E2E_* once Cypress is decommissioned.
 *
 * `.transform()` projects the env-keyed input shape to camelCase output,
 * so consumers read `config.api` / `config.baseURL`, not `config.CYPRESS_API`.
 * `Config` is inferred from the schema — single source of truth.
 *
 * Parsing is deferred to `loadConfig()` (and memoized) so importing this
 * module from tooling that doesn't have the env populated — e.g. the
 * `@nx/playwright` plugin evaluating `playwright.config.ts` to infer
 * per-spec targets — doesn't trip a `ZodError` at module load.
 */
const optionalEmail = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.email().optional()
);
const optionalPassword = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional()
);

const schema = z
  .object({
    CYPRESS_API: z.url(),
    CYPRESS_BASE_URL: z.url(),
    CYPRESS_EMAIL: z.email(),
    CYPRESS_PASSWORD: z.string().min(1),
    CYPRESS_ADMIN_EMAIL: optionalEmail,
    CYPRESS_ADMIN_PASSWORD: optionalPassword,
    CYPRESS_MULTI_EMAIL: optionalEmail,
    CYPRESS_MULTI_PASSWORD: optionalPassword,
    CYPRESS_SUSPENDED_EMAIL: optionalEmail,
    CYPRESS_SUSPENDED_PASSWORD: optionalPassword
  })
  .transform((env) => {
    const hostname = new URL(env.CYPRESS_BASE_URL).hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const defaultLocalPassword = env.CYPRESS_PASSWORD;

    return {
      api: env.CYPRESS_API,
      baseURL: env.CYPRESS_BASE_URL,
      email: env.CYPRESS_EMAIL,
      password: env.CYPRESS_PASSWORD,
      admin:
        env.CYPRESS_ADMIN_EMAIL || isLocal
          ? {
              email: env.CYPRESS_ADMIN_EMAIL ?? 'test.admin@zlv.fr',
              password: env.CYPRESS_ADMIN_PASSWORD ?? defaultLocalPassword
            }
          : undefined,
      multi:
        env.CYPRESS_MULTI_EMAIL && env.CYPRESS_MULTI_PASSWORD
          ? {
              email: env.CYPRESS_MULTI_EMAIL,
              password: env.CYPRESS_MULTI_PASSWORD
            }
          : undefined,
      suspended:
        env.CYPRESS_SUSPENDED_EMAIL || isLocal
          ? {
              email:
                env.CYPRESS_SUSPENDED_EMAIL ?? 'test.suspended.user@zlv.fr',
              password: env.CYPRESS_SUSPENDED_PASSWORD ?? defaultLocalPassword
            }
          : undefined
    };
  });

export type Config = z.infer<typeof schema>;

let envLoaded = false;
let cached: Config | undefined;

export function loadLocalEnv(): void {
  if (envLoaded) {
    return;
  }
  envLoaded = true;

  const requestedEnvFile = process.env.E2E_ENV_FILE;
  const candidates = requestedEnvFile
    ? [
        resolve(process.cwd(), requestedEnvFile),
        resolve(process.cwd(), 'apps/front-e2e-pw', requestedEnvFile)
      ]
    : [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), 'apps/front-e2e-pw/.env')
      ];

  const envFile = candidates.find(existsSync);
  if (envFile) {
    const env = parseEnv(readFileSync(envFile, 'utf8'));
    for (const [key, value] of Object.entries(env)) {
      if (requestedEnvFile || process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

export function loadConfig(): Config {
  loadLocalEnv();
  if (!cached) {
    cached = schema.parse(process.env);
  }
  return cached;
}
