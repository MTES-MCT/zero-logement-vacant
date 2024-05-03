import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('signup_links', (table) => {
      table.string('id').primary();
      table.string('prospect_email').notNullable();
      table.timestamp('expires_at').notNullable();
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.table('users').delete().whereNull('activated_at');
  await Promise.all([knex.schema.dropTable('signup_links')]);
}
