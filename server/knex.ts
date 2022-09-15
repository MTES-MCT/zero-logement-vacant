import config from './utils/config';

const developmentConfig = {
  client: 'pg',
  connection: config.databaseUrl,
  acquireConnectionTimeout: 10000,
  migrations: {
    tableName: 'knex_migrations',
    directory: '../database/migrations'
  },
  seeds: {
    directory: '../database/seed/development',
    extension: 'ts',
  }
}

const testConfig = {
  client: 'pg',
  connection: config.databaseUrlTest,
  acquireConnectionTimeout: 10000,
  migrations: {
    tableName: 'knex_migrations',
    directory: './database/migrations'
  },
  seeds: {
    directory: './database/seed/test',
    extension: 'ts',
  }
}

const productionConfig = {
  client: 'pg',
  connection: config.databaseUrl,
  acquireConnectionTimeout: 10000,
  migrations: {
    tableName: 'knex_migrations',
    directory: '../database/migrations'
  },
};

export default process.env.NODE_ENV === 'production' ? productionConfig : process.env.NODE_ENV === 'test'? testConfig : developmentConfig;
