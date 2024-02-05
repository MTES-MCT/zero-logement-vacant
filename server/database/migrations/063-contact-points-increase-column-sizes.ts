import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('contact_points', (table) => {
    table.text('opening').alter();
    table.text('address').alter();
    table.text('notes').alter();
  });
};

exports.down = function () {
  return Promise.all([]);
};
