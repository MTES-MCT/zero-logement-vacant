import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.dropTable('auth_tokens'),
    knex.table('users').delete().whereNull('activated_at'),
    knex.schema.alterTable('users', (table) => {
      table
        .timestamp('activated_at')
        .notNullable()
        .defaultTo(knex.fn.now())
        .alter();
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('auth_tokens', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table
        .uuid('user_id')
        .references('id')
        .inTable('users')
        .notNullable()
        .unique();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    }),
    knex.schema.alterTable('users', (table) => {
      table.timestamp('activated_at').nullable().alter();
    })
  ]);
}
