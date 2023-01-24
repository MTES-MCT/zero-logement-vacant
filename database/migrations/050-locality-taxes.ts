import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.alterTable('localities', (table) => {
    table.string('tax_zone');
    table.float('tax_rate');
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('localities', (table) => {
    table.dropColumns('tax_zone', 'tax_rate');
  });
};
