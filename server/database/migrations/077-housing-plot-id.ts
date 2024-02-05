import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('housing', (table) => {
    table.string('plot_id');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('housing', (table) => {
    table.dropColumn('plot_id');
  });
};
