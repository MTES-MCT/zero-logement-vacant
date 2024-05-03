import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conflicts_owners', (table) => {
    table
      .uuid('conflict_id')
      .notNullable()
      .references('id')
      .inTable('conflicts')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .uuid('owner_id')
      .notNullable()
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .comment('The existing owner');
    table
      .jsonb('replacement')
      .notNullable()
      .comment('The value with which there is a conflict');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('conflicts_owners');
}
