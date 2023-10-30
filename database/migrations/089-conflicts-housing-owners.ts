import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.createTable('conflicts_housing_owners', (table) => {
    table
      .uuid('conflict_id')
      .notNullable()
      .references('id')
      .inTable('conflicts')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.uuid('housing_id').notNullable();
    table.string('housing_geo_code').notNullable();
    table
      .foreign(['housing_geo_code', 'housing_id'])
      .references(['geo_code', 'id'])
      .inTable('fast_housing')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .uuid('owner_id')
      .nullable()
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE')
      .comment('The existing owner, if any');
    table
      .jsonb('replacement')
      .notNullable()
      .comment('The value with which there is a conflict');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable('conflicts_housing_owners');
};
