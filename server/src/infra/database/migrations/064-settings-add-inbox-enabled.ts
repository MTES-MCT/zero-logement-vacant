import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('settings', (table) => {
    table.boolean('inbox_enabled').defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('settings', (table) => {
    table.dropColumn('inbox_enabled');
  });
}
