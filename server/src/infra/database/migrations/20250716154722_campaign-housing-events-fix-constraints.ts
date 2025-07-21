import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaign_housing_events', (table) => {
    table.dropIndex('event_id');
    table.primary(['event_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaign_housing_events', (table) => {
    table.dropPrimary();
    table.index('event_id');
  });
}
