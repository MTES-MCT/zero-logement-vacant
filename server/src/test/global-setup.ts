import async from 'async';
import knex from 'knex';

import config from '~/infra/database/knexfile';

export default async function setup() {
  const db = knex(config);
  try {
    await db.migrate.latest();
    console.log('Migrated.');

    // Get list of existing tables dynamically
    const result = await db.raw(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN ('knex_migrations', 'knex_migrations_lock')
    `);
    const existingTables = result.rows.map((row: any) => row.tablename);
    console.log(`Found ${existingTables.length} tables to truncate.`);

    // Remove data from all existing tables
    await async.forEachSeries(existingTables, async (table: string) => {
      await db.raw('TRUNCATE TABLE ?? CASCADE', [table]);
      console.log(`Truncated table ${table}.`);
    });
    console.log('The database is clean!');

    await db.seed.run();
    console.log('Seeded.');
  } finally {
    await db.destroy();
  }
}
