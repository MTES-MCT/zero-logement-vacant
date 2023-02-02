import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('establishments', (table) => {
    table.string('priority');
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('establishments', (table) => {
    table.dropColumn('priority');
  });
};
