import { knex } from 'knex';

import config from '~/infra/database/knexfile';
import queue from '~/infra/queue';

export default async function teardown() {
  const db = knex(config);
  try {
    await db.migrate.rollback(undefined, true);
    console.log('Rolled back.');
  } finally {
    await db.destroy();
    await queue.close();
    console.log('Cleaned up.');
  }
}
