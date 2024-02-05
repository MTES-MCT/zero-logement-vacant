import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.createTable('reset_links', (table) => {
    table.string('id').primary();
    table.uuid('user_id').references('id').inTable('users').notNullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at');
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.dropTable('reset_links');
};
