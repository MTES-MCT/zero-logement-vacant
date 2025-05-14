import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.string('entity').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.dropColumn('entity');
  });
}
