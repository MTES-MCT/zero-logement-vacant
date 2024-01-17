import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.specificType('data_years', 'integer[]').notNullable().alter();
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.specificType('data_years', 'integer[]').nullable().alter();
  });
};
