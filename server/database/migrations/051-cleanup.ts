import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return Promise.all([
    knex.schema.alterTable('establishments', (table) => {
      table.dropColumn('housing_scopes');
    }),
    knex.schema.alterTable('campaigns_housing', (table) => {
      table.dropColumn('status_deprecated');
      table.dropColumn('step_deprecated');
      table.dropColumn('precision_deprecated');
    }),
  ]);
};

exports.down = function (knex: Knex) {
  return Promise.all([
    knex.schema.alterTable('campaigns_housing', (table) => {
      table.integer('status_deprecated');
      table.string('step_deprecated');
      table.string('precision_deprecated');
    }),
    knex.schema.alterTable('establishments', (table) => {
      table.specificType('housing_scopes', 'text[]');
    }),
  ]);
};
