import { Knex } from 'knex';

exports.up = async function (knex: Knex) {
  // Leave some space for UPDATEs and allow Postgres to do use HOT update
  // instead of DELETE + INSERT (useful for performance)
  await knex.raw('ALTER TABLE housing SET (FILLFACTOR = 80)');

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

  await knex.raw('ALTER TABLE housing SET (FILLFACTOR = 100)');
};

exports.down = function (knex: Knex) {
  return Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.dropColumns('occupancy_intended', 'occupancy');
      table.renameColumn('occupancy_registered', 'occupancy');
    }),
  ]);
};
