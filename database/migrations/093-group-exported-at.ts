import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('groups', (table) => {
    table.timestamp('exported_at');
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('groups', (table) => {
    table.dropColumns('exported_at');
  });
};
