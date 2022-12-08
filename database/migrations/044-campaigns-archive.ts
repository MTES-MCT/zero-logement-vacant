import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

exports.up = function(knex: Knex) {
  return knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.timestamp('archived_at')
  });
};

exports.down = function(knex: Knex) {
  return knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.dropColumn('archived_at')
  });
};
