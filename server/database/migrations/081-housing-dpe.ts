import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropColumn('energy_consumption_worst');
    table.timestamp('energy_consumption_at');
    table.string('building_group_id');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.string('energy_consumption_worst');
    table.dropColumn('energy_consumption_at');
    table.dropColumn('building_group_id');
  });
};
