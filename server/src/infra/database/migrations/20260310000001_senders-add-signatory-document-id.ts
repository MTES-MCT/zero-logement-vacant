import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table
      .uuid('signatory_one_document_id')
      .nullable()
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
    table
      .uuid('signatory_two_document_id')
      .nullable()
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('senders', (table) => {
    table.dropColumn('signatory_one_document_id');
    table.dropColumn('signatory_two_document_id');
  });
}
