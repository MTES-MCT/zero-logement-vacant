import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('buildings', (table) => {
    table.integer('rnb_footprint').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('buildings', (table) => {
    table.dropColumn('rnb_footprint');
  });
}
