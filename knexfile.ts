import dotenv from 'dotenv';

const result = dotenv.config()

if (result.error) {
  throw result.error
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
