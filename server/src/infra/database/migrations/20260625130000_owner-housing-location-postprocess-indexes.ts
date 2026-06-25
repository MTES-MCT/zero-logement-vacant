import type { Knex } from 'knex';

// CONCURRENTLY operations cannot run inside a transaction.
export const config = { transaction: false };

const FAST_HOUSING_DATA_FILE_YEARS_INDEX =
  'fast_housing_data_file_years_gin_idx';
const OWNERS_HOUSING_LOCATION_MISSING_INDEX =
  'idx_owners_housing_distances';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ${FAST_HOUSING_DATA_FILE_YEARS_INDEX}
    ON fast_housing USING GIN (data_file_years)
  `);

  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS ${OWNERS_HOUSING_LOCATION_MISSING_INDEX}
    ON owners_housing (owner_id, housing_id, housing_geo_code)
    WHERE rank >= 1
      AND locprop_relative_ban IS NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS ${OWNERS_HOUSING_LOCATION_MISSING_INDEX}
  `);

  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS ${FAST_HOUSING_DATA_FILE_YEARS_INDEX}
  `);
}
