import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('owner_prospects', (table) => {
    table.string('invariant');
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('owner_prospects', (table) => {
    table.dropColumn('invariant');
  });
};
