import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing', (table) => {
    table.string('plot_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('housing', (table) => {
    table.dropColumn('plot_id');
  });
}
