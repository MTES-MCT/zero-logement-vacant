import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.string('written_at', 10).notNullable();
    table.string('written_from').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('drafts', (table) => {
    table.dropColumn('written_at');
    table.dropColumn('written_from');
  });
}
