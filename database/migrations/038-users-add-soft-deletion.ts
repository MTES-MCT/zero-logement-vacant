import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

exports.up = function(knex: Knex) {
  return knex.schema.alterTable('users', (table: CreateTableBuilder) => {
    table.timestamp('deleted_at')
      .nullable()
      .defaultTo(null)
  });
};

exports.down = function(knex: Knex) {
  return knex.schema.alterTable('users', (table: CreateTableBuilder) => {
    table.dropColumn('deleted_at')
  });
};
