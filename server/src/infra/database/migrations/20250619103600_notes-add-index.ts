import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_notes', (table) => {
    table.index(['housing_geo_code', 'housing_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_notes', (table) => {
    table.dropIndex(['housing_geo_code', 'housing_id']);
  });
}
