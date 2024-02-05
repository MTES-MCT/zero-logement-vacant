import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
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
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable('conflicts_owners');
};
