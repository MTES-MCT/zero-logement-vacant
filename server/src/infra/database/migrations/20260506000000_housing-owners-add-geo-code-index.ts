import type { Knex } from 'knex';

// CONCURRENTLY operations cannot run inside a transaction
export const config = { transaction: false };

const NEW_INDEX = 'owners_housing_geo_code_rank_owner_idx';

export async function up(knex: Knex): Promise<void> {
  // New index: allows WHERE housing_geo_code IN (...) AND rank = 1 to use an
  // index scan instead of a full sequential scan. Needed by the multiOwners and
  // beneficiaryCounts filters in housingRepository.count().
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ${NEW_INDEX}
    ON owners_housing (housing_geo_code, rank, owner_id)
  `);

  // idx_owners_housing_update and idx_owners_housing_owner_housing are both
  // non-unique (owner_id, housing_id) indexes — exact duplicates of each other
  // and redundant with the PK (owner_id, housing_id, housing_geo_code).
  await knex.raw(
    'DROP INDEX CONCURRENTLY IF EXISTS idx_owners_housing_update'
  );
  await knex.raw(
    'DROP INDEX CONCURRENTLY IF EXISTS idx_owners_housing_owner_housing'
  );

  // idx_end_date indexes a column only used in ORDER BY after a high-selectivity
  // WHERE owner_id = ? filter. The result set is tiny; the index is never chosen.
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS idx_end_date');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS ${NEW_INDEX}`
  );
  await knex.raw(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owners_housing_update ON owners_housing (owner_id, housing_id)'
  );
  await knex.raw(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_owners_housing_owner_housing ON owners_housing (owner_id, housing_id)'
  );
  await knex.raw(
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_end_date ON owners_housing (end_date)'
  );
}
