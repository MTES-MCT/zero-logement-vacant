import { knex } from 'knex';

import config from '../knex';

export default async function teardown() {
  const db = knex(config);
  try {
    await db.migrate.rollback(undefined, true);
    console.log('Rolled back.');
  } finally {
    await db.destroy();
  }
}
