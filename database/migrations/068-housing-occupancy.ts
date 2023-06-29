import { Knex } from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema
    .alterTable('housing', (table) => {
      table.renameColumn('occupancy', 'occupancy_registered');
    })
    .then(() =>
      knex.schema.alterTable('housing', (table) => {
        table.string('occupancy').notNullable().defaultTo('V');
        table.string('occupancy_intended');
      })
    )
    .then(() =>
      knex
        .table('housing')
        .update({ occupancy: knex.ref('occupancy_registered') })
    );
};

exports.down = function (knex: Knex) {
  return Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.dropColumns('occupancy_intended', 'occupancy');
      table.renameColumn('occupancy_registered', 'occupancy');
    }),
  ]);
};
