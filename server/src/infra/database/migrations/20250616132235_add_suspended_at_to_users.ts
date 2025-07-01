import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.timestamp('suspended_at').nullable();
    table.text('suspended_cause').nullable();
  });

  await knex.schema.table('users', (table) => {
    table.index('suspended_at', 'idx_users_suspended_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropIndex('suspended_at', 'idx_users_suspended_at');
  });

  await knex.schema.table('users', (table) => {
    table.dropColumn('suspended_at');
    table.dropColumn('suspended_cause');
  });
}