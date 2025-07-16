import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.dropNullable('created_at');
  });
  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS events_type_created_at_idx ON events (type, created_at DESC)'
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.dropIndex(['type', 'created_at'], 'events_type_created_at_idx');
  });
}
