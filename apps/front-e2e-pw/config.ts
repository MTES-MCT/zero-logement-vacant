import convict from 'convict';

/**
 * Env config for the Playwright pilot. Intentionally reuses the same
 * CYPRESS_* env vars the existing Cypress suite reads so the same .env
 * (or CI secret bundle) works for both — see `apps/front-e2e/config.ts`.
 * Rename to E2E_* once Cypress is decommissioned.
 */
export interface Config {
  api: string;
  baseURL: string;
  email: string;
  password: string;
}

const config = convict<Config>({
  api: {
    env: 'CYPRESS_API',
    doc: 'The API URL',
    format: String,
    default: null,
    nullable: false
  },
  baseURL: {
    env: 'CYPRESS_BASE_URL',
    doc: 'The base URL of the application under test',
    format: String,
    default: null,
    nullable: false
  },
  email: {
    env: 'CYPRESS_EMAIL',
    doc: 'Email of the seeded test user',
    format: String,
    default: null,
    sensitive: true,
    nullable: false
  },
  password: {
    env: 'CYPRESS_PASSWORD',
    doc: 'Password of the seeded test user',
    format: String,
    default: null,
    sensitive: true,
    nullable: false
  }
});

export default config.get();
