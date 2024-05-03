import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns_housing', (table) => {
      table.integer('status').defaultTo(0);
      table.string('step');
      table.string('precision');
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns_housing', (table) => {
      table.dropColumns('status', 'step', 'precision');
    }),
  ]);
}
