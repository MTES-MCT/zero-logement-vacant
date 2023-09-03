import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.createTableLike('owners_duplicates', 'owners', (table) => {
    table
      .uuid('source_id')
      .notNullable()
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable('owners_duplicates');
};
