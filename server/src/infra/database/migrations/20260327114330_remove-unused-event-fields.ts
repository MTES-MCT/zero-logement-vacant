import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.dropColumns('name', 'conflict', 'contact_kind', 'old', 'new');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.string('name');
    table.boolean('conflict');
    table.string('contact_kind');
    table.jsonb('old');
    table.jsonb('new');
  });
}
