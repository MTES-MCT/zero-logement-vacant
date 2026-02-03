import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('document_events', (table) => {
    table.uuid('event_id').primary().references('id').inTable('events').onDelete('CASCADE');
    table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');
    table.index('document_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('document_events');
}
