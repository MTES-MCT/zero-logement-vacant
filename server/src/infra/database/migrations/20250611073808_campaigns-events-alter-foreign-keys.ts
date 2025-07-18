import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaign_events', (table) => {
    table.index('event_id');

    table.dropForeign('campaign_id');
    table
      .foreign('campaign_id')
      .references('id')
      .inTable('campaigns')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.dropForeign('event_id');
    table
      .foreign('event_id')
      .references('id')
      .inTable('events')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaign_events', (table) => {
    table.dropForeign('campaign_id');
    table.foreign('campaign_id').references('id').inTable('campaigns');

    table.dropForeign('event_id');
    table.foreign('event_id').references('id').inTable('events');

    table.dropIndex('event_id');
  });
}
