import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.createTable('settings', (table) => {
    table.uuid('id').primary();
    table
      .uuid('establishment_id')
      .references('id')
      .inTable('establishments')
      .unique();
    table.boolean('contact_points_public').notNullable();
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.dropTable('settings');
};
