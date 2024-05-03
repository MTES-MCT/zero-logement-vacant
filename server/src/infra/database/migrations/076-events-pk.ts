import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_events', (table) => {
    table.primary(['housing_id', 'event_id']);
  });
  await knex.schema.alterTable('owner_events', (table) => {
    table.primary(['owner_id', 'event_id']);
  });
  await knex.schema.alterTable('campaign_events', (table) => {
    table.primary(['campaign_id', 'event_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing_events', (table) => {
    table.dropPrimary();
  });
  await knex.schema.alterTable('owner_events', (table) => {
    table.dropPrimary();
  });
  await knex.schema.alterTable('campaign_events', (table) => {
    table.dropPrimary();
  });
}
