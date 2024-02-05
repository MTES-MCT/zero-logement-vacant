import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy').defaultTo('V').alter();
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy').alter();
  });
};
