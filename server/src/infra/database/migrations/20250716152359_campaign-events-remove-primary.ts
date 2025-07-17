import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaign_events', (table) => {
    table.dropIndex('event_id');
    table.dropPrimary();
    table.primary(['event_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaign_events', (table) => {
    table.dropPrimary();
    table.primary(['campaign_id', 'event_id']);
    table.index('event_id');
  });
}
