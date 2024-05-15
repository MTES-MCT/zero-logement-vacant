import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.string('source');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropColumn('source');
  });
}
