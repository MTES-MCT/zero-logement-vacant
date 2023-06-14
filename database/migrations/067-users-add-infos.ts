import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('phone');
    table.string('position');
    table.string('time_per_week');
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('phone');
    table.dropColumn('position');
    table.dropColumn('time_per_week');
  });
};
