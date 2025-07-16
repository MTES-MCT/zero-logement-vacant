import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_events', (table) => {
    table.dropForeign('event_id');
    table
      .foreign('event_id')
      .references('id')
      .inTable('events')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table.dropForeign('owner_id');
    table
      .foreign('owner_id')
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table.dropPrimary();
    table.primary(['event_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_events', (table) => {
    table.dropPrimary();
    table.primary(['owner_id', 'event_id']);

    table.dropForeign('owner_id');
    table.foreign('owner_id').references('id').inTable('owners');

    table.dropForeign('event_id');
    table.foreign('event_id').references('id').inTable('events');
  });
}
