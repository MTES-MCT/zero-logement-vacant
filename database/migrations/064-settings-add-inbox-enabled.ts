import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('settings', (table) => {
    table.boolean('inbox_enabled').defaultTo(true);
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('settings', (table) => {
    table.dropColumn('inbox_enabled');
  });
};
