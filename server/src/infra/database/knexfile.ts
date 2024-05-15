import { Knex } from 'knex';
import path from 'node:path';

import config from '~/infra/config';
import { logger } from '~/infra/logger';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: config.db.url,
  acquireConnectionTimeout: 10_000,
  pool: {
    min: 0,
    max: config.db.pool.max
  },
  log: {
    debug: (message) => logger.debug(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message)
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, 'migrations')
  },
  seeds: {
    directory: path.join(__dirname, 'seeds', config.db.env),
    timestampFilenamePrefix: true
  }
};

export default knexConfig;
