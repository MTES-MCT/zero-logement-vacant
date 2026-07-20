import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('campaign_document_events', (table) => {
    table
      .uuid('event_id')
      .primary()
      .references('id')
      .inTable('events')
      .onDelete('CASCADE');
    table
      .uuid('document_id')
      .notNullable()
      .references('id')
      .inTable('documents')
      .onDelete('CASCADE');
    table
      .uuid('campaign_id')
      .notNullable()
      .references('id')
      .inTable('campaigns')
      .onDelete('CASCADE');

    table.index('document_id');
    table.index('campaign_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('campaign_document_events');
}
