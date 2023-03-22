import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('owner_prospects', (table) => {
    table.boolean('read').notNullable().defaultTo(false);
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('owner_prospects', (table) => {
    table.dropColumn('read');
  });
};
