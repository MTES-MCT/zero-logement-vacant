import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    // Kind admin: sub-type from CSV Kind-admin column (e.g., "COM", "REG", "DREAL")
    // Distinct from 'kind' which contains the establishment type set by users
    table.string('kind_admin', 50).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table.dropColumn('kind_admin');
  });
}
