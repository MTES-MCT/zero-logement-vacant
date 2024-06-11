import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy').defaultTo('V').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing', (table) => {
    table.string('occupancy').alter();
  });
}
