import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_events', (table) => {
    table.dropPrimary();
    table.primary(['event_id']);

    table.dropIndex(['housing_id', 'event_id', 'housing_geo_code']);
    table.index(['housing_geo_code', 'housing_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_events', (table) => {
    table.dropIndex(['housing_geo_code', 'housing_id']);
    table.index(['housing_id', 'event_id', 'housing_geo_code']);

    table.dropPrimary();
    table.primary(['housing_id', 'event_id']);
  });
}
