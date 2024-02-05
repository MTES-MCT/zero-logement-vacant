import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.string('source');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropColumn('source');
  });
};
