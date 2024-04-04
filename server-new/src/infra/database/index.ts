import { Knex, knex } from 'knex';
import path from 'node:path';

import config from '~/config';
import { logger } from '~/infra/logger';

const db = knex({
  client: 'pg',
  connection: config.db.url,
  acquireConnectionTimeout: 10_000,
  pool: {
    min: 0,
    max: config.db.pool.max,
  },
  log: {
    debug: (message) => logger.debug(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message),
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, 'migrations'),
  },
  seeds: {
    directory: path.join(__dirname, 'seeds', config.app.env),
  },
});

export function notDeleted(builder: Knex.QueryBuilder<{ deleted_at: Date }>) {
  builder.whereNull('deleted_at');
}

export default db;
