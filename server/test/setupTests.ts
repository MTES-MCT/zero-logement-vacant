import { enableFetchMocks } from 'jest-fetch-mock';
import 'jest-sorted';
import { knex } from 'knex';

import knexConfig from '../knex';
import db from '../repositories/db';
import { logger } from '../utils/logger';

enableFetchMocks();

global.beforeEach(async () => {
  fetchMock.resetMocks();

  const db = knex(knexConfig);
  try {
    await db.migrate.latest();
    await db.seed.run();
  } finally {
    await db.destroy();
  }
});

global.afterEach(async () => {
  const db = knex(knexConfig);
  try {
    await db.migrate.rollback();
    logger.info('Rolled back');
  } finally {
    await db.destroy();
  }
});

global.afterAll(async () => {
  await db.destroy();
});
