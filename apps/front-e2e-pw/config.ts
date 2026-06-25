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
const schema = z
  .object({
    CYPRESS_API: z.string().url(),
    CYPRESS_BASE_URL: z.string().url(),
    CYPRESS_EMAIL: z.string().email(),
    CYPRESS_PASSWORD: z.string().min(1)
  })
  .transform((env) => ({
    api: env.CYPRESS_API,
    baseURL: env.CYPRESS_BASE_URL,
    email: env.CYPRESS_EMAIL,
    password: env.CYPRESS_PASSWORD
  }));

export type Config = z.infer<typeof schema>;

let cached: Config | undefined;

export function loadConfig(): Config {
  if (!cached) {
    cached = schema.parse(process.env);
  }
  return cached;
}
