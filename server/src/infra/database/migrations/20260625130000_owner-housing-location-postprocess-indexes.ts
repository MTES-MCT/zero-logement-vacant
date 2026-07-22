import type { Knex } from 'knex';

// CONCURRENTLY operations cannot run inside a transaction.
export const config = { transaction: false };

const FAST_HOUSING_DATA_FILE_YEARS_INDEX_SUFFIX = 'data_file_years_gin_idx';
const OWNERS_HOUSING_LOCATION_MISSING_INDEX = 'idx_owners_housing_distances';

interface FastHousingPartition {
  schema_name: string;
  table_name: string;
}

async function getFastHousingPartitions(
  knex: Knex
): Promise<FastHousingPartition[]> {
  const { rows } = await knex.raw(`
    SELECT namespace.nspname AS schema_name,
           child.relname AS table_name
    FROM pg_inherits
    JOIN pg_class child
      ON child.oid = pg_inherits.inhrelid
    JOIN pg_class parent
      ON parent.oid = pg_inherits.inhparent
    JOIN pg_namespace namespace
      ON namespace.oid = child.relnamespace
    WHERE parent.oid = 'fast_housing'::regclass
    ORDER BY child.relname
  `);

  return rows;
}

function getFastHousingDataFileYearsIndexName(tableName: string): string {
  return `${tableName}_${FAST_HOUSING_DATA_FILE_YEARS_INDEX_SUFFIX}`;
}

export async function up(knex: Knex): Promise<void> {
  const partitions = await getFastHousingPartitions(knex);

  for (const partition of partitions) {
    await knex.raw(
      `
        CREATE INDEX CONCURRENTLY IF NOT EXISTS ??
        ON ??.?? USING GIN (data_file_years)
      `,
      [
        getFastHousingDataFileYearsIndexName(partition.table_name),
        partition.schema_name,
        partition.table_name
      ]
    );
  }

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

  const partitions = await getFastHousingPartitions(knex);

  for (const partition of partitions) {
    await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS ??.??', [
      partition.schema_name,
      getFastHousingDataFileYearsIndexName(partition.table_name)
    ]);
  }
}
