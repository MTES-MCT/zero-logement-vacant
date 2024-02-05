import { Knex } from 'knex';

exports.up = async function (knex: Knex) {
  await knex.schema.alterTable('housing', (table) => {
    table.renameColumn('occupancy', 'occupancy_registered');
  });

  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy');
    table.string('occupancy_intended');
  });

  await knex
    .table('housing')
    .update({ occupancy: knex.ref('occupancy_registered') });

  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy').notNullable().alter();
  });
};

exports.down = function (knex: Knex) {
  return Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.dropColumns('occupancy_intended', 'occupancy');
      table.renameColumn('occupancy_registered', 'occupancy');
    }),
  ]);
};
