import { Knex, knex } from 'knex';

import db from '../server/repositories/db';
import config from '../server/utils/config';
import path from 'path';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: config.databaseUrlTest,
  acquireConnectionTimeout: 10000,
  migrations: {
    tableName: 'knex_migrations',
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
  },
};

global.beforeAll(async () => {
  const db = knex(knexConfig);
  try {
    await db.migrate.rollback({}, true);
  } catch (error) {
    console.log(error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
});

global.afterEach(async () => {
  const db = knex(knexConfig);
  try {
    await db.migrate.rollback({}, true);
  } catch (error) {
    console.log(error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
});

global.afterAll(async () => {
  await db.destroy();
});
