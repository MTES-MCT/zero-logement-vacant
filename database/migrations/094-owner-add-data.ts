import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('owners', (table) => {
    table.string('location');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('owners', (table) => {
    table.dropColumns('location');
  });
};
