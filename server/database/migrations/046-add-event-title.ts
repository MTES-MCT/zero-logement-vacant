import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

exports.up = async function (knex: Knex) {
  await knex.schema.alterTable('events', (table: CreateTableBuilder) => {
    table.string('title').defaultTo(null);
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.alterTable('events', (table: CreateTableBuilder) => {
    table.dropColumn('title');
  });
};
