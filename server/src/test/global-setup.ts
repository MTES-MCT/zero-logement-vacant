import async from 'async';
import { knex } from 'knex';

import config from '~/infra/database/knexfile';

const tables: string[] = [
  'ban_addresses',
  'buildings',
  'campaign_events',
  'campaigns',
  'campaigns',
  'campaigns_drafts',
  'campaigns_housing',
  'conflicts',
  'conflicts_housing_owners',
  'conflicts_owners',
  'contact_points',
  'df_housing_nat',
  'df_owners_nat',
  'drafts',
  'establishments',
  'establishments_localities',
  'events',
  'fast_housing',
  'geo_perimeters',
  'group_housing_events',
  'groups',
  'groups_housing',
  'housing',
  'housing_events',
  'housing_notes',
  'localities',
  'notes',
  'old_events',
  'owner_events',
  'owner_matches',
  'owner_notes',
  'owner_prospects',
  'owners',
  'owners_duplicates',
  'owners_housing',
  'prospects',
  'reset_links',
  'senders',
  'settings',
  'signup_links',
  'users'
];

export default async function setup() {
  const db = knex(config);
  try {
    await db.migrate.latest();
    console.log('Migrated.');

    // Remove data from all tables
    await async.forEachSeries(tables, async (table) => {
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
