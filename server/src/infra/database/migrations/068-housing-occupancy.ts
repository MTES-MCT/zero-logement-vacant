import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing', (table) => {
    table.renameColumn('occupancy', 'occupancy_registered');
  });

  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy');
    table.string('occupancy_intended');
  });

  await knex
    .table('housing')
    .update({ occupancy: knex.ref('occupancy_registered'), });

  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy').notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.dropColumns('occupancy_intended', 'occupancy');
      table.renameColumn('occupancy_registered', 'occupancy');
    })
  ]);
}
