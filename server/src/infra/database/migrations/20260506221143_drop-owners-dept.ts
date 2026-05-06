import type { Knex } from 'knex';

/**
 * Drops the `owners_dept` table.
 *
 * Originally created by `20241223105911-owners-dept` to track per-department
 * owner snapshots. Superseded by the unified owners pipeline.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('owners_dept');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('owners_dept', (table) => {
    table
      .uuid('owner_id')
      .notNullable()
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.string('owner_idpersonne').notNullable();
    table.unique(['owner_idpersonne', 'owner_id']);
  });
}
