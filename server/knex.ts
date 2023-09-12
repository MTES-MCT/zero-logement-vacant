import { knex } from 'knex';

import config from './utils/config';
import path from 'path';

type KnexConfig = Exclude<Parameters<typeof knex>[0], string>;

const defaultConfig: KnexConfig = {
  client: 'pg',
  connection: config.databaseUrl,
  acquireConnectionTimeout: 10_000,
  pool: {
    min: 0,
    max: 10,
    createTimeoutMillis: 5_000,
    acquireTimeoutMillis: 5_000,
    destroyTimeoutMillis: 5_000,
    idleTimeoutMillis: 600_000,
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, '..', 'database', 'migrations'),
  },
};

const dummyConfig: KnexConfig = {
  ...defaultConfig,
  seeds: {
    directory: path.join(__dirname, '..', 'database', 'seeds', 'dummy'),
    extension: 'ts',
  },
};

const testConfig: KnexConfig = {
  ...defaultConfig,
  connection: config.databaseUrlTest,
  migrations: {
    ...defaultConfig.migrations,
    directory: path.join(__dirname, '..', 'database', 'migrations'),
  },
  seeds: {
    directory: path.join(__dirname, '..', 'database', 'seeds', 'test'),
    extension: 'ts',
  },
};

const productionConfig: KnexConfig = {
  ...defaultConfig,
  seeds: {
    directory: path.join(__dirname, '..', 'database', 'seeds', 'production'),
    extension: 'ts',
  },
};

export default config.databaseEnvironment === 'production'
  ? productionConfig
  : config.databaseEnvironment === 'test'
  ? testConfig
  : dummyConfig;
