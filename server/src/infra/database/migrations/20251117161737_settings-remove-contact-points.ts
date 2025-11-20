import type { Knex } from 'knex';

const TABLE = 'settings';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE, (table) => {
    table.dropColumn('contact_points_public');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE, (table) => {
    table.boolean('contact_points_public').notNullable();
  });
}
