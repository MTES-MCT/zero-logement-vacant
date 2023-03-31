import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('owner_prospects', (table) => {
    table.boolean('call_back').notNullable().defaultTo(false);
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('owner_prospects', (table) => {
    table.dropColumn('call_back');
  });
};
