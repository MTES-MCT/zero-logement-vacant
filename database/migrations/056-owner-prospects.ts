import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return Promise.all([
    knex.schema.alterTable('owner_prospects', (table) => {
      table.string('address').nullable().alter();
    }),
  ]);
};

exports.down = function () {};
