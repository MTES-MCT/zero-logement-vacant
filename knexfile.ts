import dotenv from 'dotenv';
import config from './server/utils/config';

if (config.environment === 'development') {
  dotenv.config();
  console.log('process.env.DATABASE_URL', process.env.DATABASE_URL)
}

export default {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  acquireConnectionTimeout: 10000,
  migrations: {
    tableName: 'knex_migrations',
    directory: './database/migrations'
  },
  seeds: {
    directory: './test/seed',
    extension: 'ts',
  },
};
