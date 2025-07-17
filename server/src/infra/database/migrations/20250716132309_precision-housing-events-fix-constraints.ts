import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('precision_housing_events', (table) => {
    table.dropIndex('event_id');
    table.dropForeign('event_id');
    table
      .foreign('event_id')
      .references('id')
      .inTable('events')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.primary(['event_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('precision_housing_events', (table) => {
    table.dropPrimary();
    table.dropForeign('event_id');
    table
      .foreign('event_id')
      .references('id')
      .inTable('events')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');
    table.index('event_id');
  });
}
