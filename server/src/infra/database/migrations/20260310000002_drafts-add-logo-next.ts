import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table
      .uuid('logo_next_one')
      .nullable()
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
    table
      .uuid('logo_next_two')
      .nullable()
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.dropColumn('logo_next_one');
    table.dropColumn('logo_next_two');
  });
}
