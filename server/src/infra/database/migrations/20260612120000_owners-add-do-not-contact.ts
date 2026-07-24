import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add the column as nullable first so the change is instant on the populated
  // `owners` table (no rewrite, no default backfill lock).
  await knex.schema.alterTable('owners', (table) => {
    table.boolean('do_not_contact').nullable();
  });

  // Backfill existing rows to the default "may be contacted" state.
  await knex('owners').update({ do_not_contact: false });

  // Then enforce the invariant: the flag is always a boolean, defaulting to
  // false for future inserts.
  await knex.schema.alterTable('owners', (table) => {
    table.boolean('do_not_contact').notNullable().defaultTo(false).alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.dropColumn('do_not_contact');
  });
}
