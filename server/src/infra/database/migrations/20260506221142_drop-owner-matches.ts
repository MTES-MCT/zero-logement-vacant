import type { Knex } from 'knex';

/**
 * Drops the `owner_matches` table.
 *
 * Originally created by `085-owner-matches` to map LOVAC owner UUIDs to
 * `idpersonne`. The same mapping now lives directly on `owners.idpersonne`
 * (added by the source-owners pipeline), so the auxiliary table is unused.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('owner_matches');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('owner_matches', (table) => {
    table
      .uuid('owner_id')
      .references('id')
      .inTable('owners')
      .notNullable()
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.string('idpersonne').notNullable();
    table.primary(['owner_id', 'idpersonne']);
    table.index('owner_id', 'idx_owner_id');
  });
}
