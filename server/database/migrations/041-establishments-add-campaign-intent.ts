import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

exports.up = function(knex: Knex) {
  return knex.schema.alterTable('establishments', (table: CreateTableBuilder) => {
    table.string('campaign_intent')
      .nullable()
      .defaultTo(null)
  });
};

exports.down = function(knex: Knex) {
  return knex.schema.alterTable('establishments', (table: CreateTableBuilder) => {
    table.dropColumn('campaign_intent')
  });
};
