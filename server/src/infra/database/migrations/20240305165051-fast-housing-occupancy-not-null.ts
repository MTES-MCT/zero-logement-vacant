import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex
    .table('housing')
    .whereNull('occupancy')
    .update('occupancy', 'inconnu');

  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy').notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy').nullable().alter();
  });

  await knex
    .table('housing')
    .where('occupancy', 'inconnu')
    .update('occupancy', null);
}
