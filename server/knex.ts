import config from './utils/config';

const defaultConfig = {
  client: 'pg',
  connection: config.databaseUrl,
  acquireConnectionTimeout: 10000,
  migrations: {
    tableName: 'knex_migrations',
    directory: './database/migrations'
  },
  seeds: {
    directory: './database/seed',
    extension: 'ts',
  },
};

const testConfig = {
  client: 'pg',
  connection: config.databaseUrlTest,
  acquireConnectionTimeout: 10000,
  migrations: {
    tableName: 'knex_migrations',
    directory: './server/database/migrations'
  },
  seeds: {
    directory: './server/database/seed',
    extension: 'ts',
  }
}

export default process.env.NODE_ENV === 'test' ? testConfig : defaultConfig;
