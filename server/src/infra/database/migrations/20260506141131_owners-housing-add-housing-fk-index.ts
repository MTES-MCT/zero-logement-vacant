import type { Knex } from 'knex';

/**
 * Adds an index on `owners_housing(housing_geo_code, housing_id)` to back the
 * FK to `fast_housing(geo_code, id)`. PostgreSQL does not auto-create indexes
 * on referencing columns, so bulk DELETE/UPDATE filtered by the FK tuple — and
 * cascades from `fast_housing` — were falling back to seq scans of the whole
 * table.
 *
 * The LOVAC housing-owner import uses
 * `WHERE (housing_geo_code, housing_id) IN (...)` to replace owners per housing
 * batch; this index makes that lookup an index scan instead.
 */
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS owners_housing_housing_geo_code_housing_id_idx
    ON owners_housing (housing_geo_code, housing_id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'DROP INDEX CONCURRENTLY IF EXISTS owners_housing_housing_geo_code_housing_id_idx'
  );
}
