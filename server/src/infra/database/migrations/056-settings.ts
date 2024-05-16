import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('settings', (table) => {
    table.uuid('id').primary();
    table
      .uuid('establishment_id')
      .references('id')
      .inTable('establishments')
      .unique();
    table.boolean('contact_points_public').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('settings');
}
