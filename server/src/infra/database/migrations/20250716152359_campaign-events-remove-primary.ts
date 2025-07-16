import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaign_events', (table) => {
    table.dropPrimary();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaign_events', (table) => {
    table.primary(['campaign_id', 'event_id']);
  });
}
