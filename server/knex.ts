import config from './utils/config';

export default {
  client: 'pg',
  connection: `${config.databaseUrl}/zlv`,
  acquireConnectionTimeout: 10000,
  migrations: {
    tableName: 'knex_migrations',
    directory: '../database/migrations'
  },
  seeds: {
    directory: './test/seed',
    extension: 'ts',
  },
};
