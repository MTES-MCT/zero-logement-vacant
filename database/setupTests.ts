import { knex } from 'knex';

import knexConfig from '../server/knex';
import db from '../server/repositories/db';

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
