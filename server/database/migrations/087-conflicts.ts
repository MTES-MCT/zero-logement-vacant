import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.createTable('conflicts', (table) => {
    table.uuid('id').notNullable().primary();
    table.timestamp('created_at').notNullable();
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable('conflicts');
};
