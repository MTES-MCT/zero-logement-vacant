import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    // Must include all partitioned columns
    table.unique(['geo_code', 'local_id'], { useConstraint: true });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropUnique(['geo_code', 'local_id']);
  });
}
