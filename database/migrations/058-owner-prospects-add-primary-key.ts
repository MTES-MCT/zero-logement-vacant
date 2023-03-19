import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('owner_prospects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('owner_prospects', (table) => {
    table.dropColumn('id');
  });
};
