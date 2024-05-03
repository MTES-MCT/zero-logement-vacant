import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('users', (table) => {
      table.timestamp('last_authenticated_at');
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('users', (table) => {
      table.dropColumn('last_authenticated_at');
    }),
  ]);
}
