import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('group_housing_events', (table) => {
    table.index('event_id');
    table.index(['housing_geo_code', 'housing_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('group_housing_events', (table) => {
    table.dropIndex('event_id');
    table.dropIndex(['housing_geo_code', 'housing_id']);
  });
}
