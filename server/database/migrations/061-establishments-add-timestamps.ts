import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('establishments', (table) => {
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('establishments', (table) => {
    table.dropColumn('updated_at');
  });
};
