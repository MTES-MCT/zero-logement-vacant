import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

exports.up = function(knex: Knex) {
  return knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.renameColumn('start_month', 'start_month_deprecated')
    table.string('start_month').nullable().alter()
  });
};

exports.down = function(knex: Knex) {
  return knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.renameColumn('start_month_deprecated', 'start_month')
  });
};
