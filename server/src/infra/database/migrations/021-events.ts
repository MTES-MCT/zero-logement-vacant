import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('events', (table) => {
      table.uuid('created_by').nullable().alter();
      table.text('content').alter();
    })
  ]);
}

export async function down(): Promise<void> {}
