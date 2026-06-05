import type { Knex } from 'knex';

/**
 * Drops the `owners_duplicates` table.
 *
 * Originally created by `077-owner-duplicates` (LIKE owners + source_id) as
 * a staging area for deduplication. No longer used.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('owners_duplicates');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTableLike('owners_duplicates', 'owners', (table) => {
    table.uuid('source_id').notNullable();
  });
}
