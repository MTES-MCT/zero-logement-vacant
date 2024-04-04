import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.raw(
      "update housing set ownership_kind = null where ownership_kind='0'",
    ),
  ]);
}

export async function down(): Promise<void> {
  // No rollback
}
