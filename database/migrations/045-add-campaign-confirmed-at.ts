import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

exports.up = async function(knex: Knex) {
  await knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.timestamp('confirmed_at');
  });
  await knex.table('campaigns')
    .whereNotNull('sent_at')
    .update('confirmed_at', new Date())
};

exports.down = function(knex: Knex) {
  return knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.dropColumn('confirmed_at');
  });
};
