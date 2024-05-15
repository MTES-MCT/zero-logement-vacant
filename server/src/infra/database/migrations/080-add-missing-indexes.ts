import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_events', (table) => {
    table.index(['housing_id', 'event_id', 'housing_geo_code']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_events', (table) => {
    table.dropIndex(['housing_id', 'event_id', 'housing_geo_code']);
  });
}
