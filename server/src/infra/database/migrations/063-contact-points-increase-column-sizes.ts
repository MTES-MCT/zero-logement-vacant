import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('contact_points', (table) => {
    table.text('opening').alter();
    table.text('address').alter();
    table.text('notes').alter();
  });
}

export async function down(): Promise<void> {
  await Promise.all([]);
}
