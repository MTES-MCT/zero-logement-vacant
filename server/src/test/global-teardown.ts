import { knex } from 'knex';

import config from '~/infra/database/knexfile';

export default async function teardown() {
  const db = knex(config);
  try {
    await db.migrate.rollback(undefined, true);
    console.log('Rolled back.');
  } finally {
    await db.destroy();
    console.log('Cleaned up.');
  }
}
