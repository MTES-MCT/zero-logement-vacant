import knex from 'knex';
import knexConfig from '../knex';
import db from '../repositories/db';
import { enableFetchMocks } from 'jest-fetch-mock';

enableFetchMocks();

jest.useFakeTimers({
  legacyFakeTimers: true,
});

global.beforeEach(async () => {
  const db = knex(knexConfig);
  try {
    await db.migrate.latest();
    await db.seed.run();
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
    await db.migrate.rollback();
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
