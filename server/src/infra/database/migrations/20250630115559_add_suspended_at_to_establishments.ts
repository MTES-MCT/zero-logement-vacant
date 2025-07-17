import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('establishments', (table) => {
    table.timestamp('suspended_at').nullable();
    table.text('suspended_cause').nullable();
    table.timestamp('deleted_at').nullable();
  });

  await knex.schema.table('establishments', (table) => {
    table.index('suspended_at', 'idx_establishments_suspended_at');
    table.index('deleted_at', 'idx_establishments_deleted_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('establishments', (table) => {
    table.dropIndex('suspended_at', 'idx_establishments_suspended_at');
    table.dropIndex('deleted_at', 'idx_establishments_deleted_at');
  });

  await knex.schema.table('establishments', (table) => {
    table.dropColumn('suspended_at');
    table.dropColumn('suspended_cause');
    table.dropColumn('deleted_at');
  });
}