import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('owners', (table) => {
    table.text('additional_address');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('owners', (table) => {
    table.dropColumns('additional_address');
  });
};
