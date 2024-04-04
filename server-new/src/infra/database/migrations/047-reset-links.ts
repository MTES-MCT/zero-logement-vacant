import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reset_links', (table) => {
    table.string('id').primary();
    table.uuid('user_id').references('id').inTable('users').notNullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('reset_links');
}
