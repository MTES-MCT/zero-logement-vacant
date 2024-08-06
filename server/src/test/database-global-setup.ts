import { knex } from 'knex';

import config from '~/infra/database/knexfile';

export default async function setup() {
  const db = knex(config);
  try {
    await db.migrate.latest();
    console.log('Migrated.');
  } finally {
    await db.destroy();
  }
}
