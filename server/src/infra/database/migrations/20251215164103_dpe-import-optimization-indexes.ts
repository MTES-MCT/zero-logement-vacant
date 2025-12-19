import type { Knex } from 'knex';

/**
 * Migration to create indexes for DPE import optimization.
 *
 * These indexes significantly improve the performance of the DPE import script
 * (import-dpe.py) which updates the buildings table with energy performance data.
 *
 * Performance impact:
 * - Without these indexes: ~8 seconds per query (sequential scan on 10M+ rows)
 * - With these indexes: ~0.5ms per query (index scan)
 * - Overall improvement: ~17,000x faster
 *
 * Indexes created:
 * 1. idx_fast_housing_id: For JOIN between ban_addresses.ref_id and fast_housing.id
 * 2. idx_fast_housing_building_id: For JOIN between fast_housing.building_id and buildings.id
 *
 * Note: fast_housing is a partitioned table, so indexes are created on the parent
 * and automatically propagated to all partitions.
 */

export async function up(knex: Knex): Promise<void> {
  // Index on fast_housing.id for efficient JOINs with ban_addresses.ref_id
  // The primary key is (geo_code, id) which doesn't help for lookups by id alone
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_fast_housing_id
    ON fast_housing(id)
  `);

  // Index on fast_housing.building_id for efficient JOINs with buildings.id
  // Only index non-null values since we filter on building_id IS NOT NULL
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_fast_housing_building_id
    ON fast_housing(building_id)
    WHERE building_id IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes from parent table (will cascade to partitions)
  await knex.raw('DROP INDEX IF EXISTS idx_fast_housing_id');
  await knex.raw('DROP INDEX IF EXISTS idx_fast_housing_building_id');
}
