import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('settings');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table
      .uuid('establishment_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('establishments');
    table.boolean('inbox_enabled').notNullable().defaultTo(false);
  });
}
