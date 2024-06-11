import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
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
      table.integer('role');
      table.timestamp('activated_at');
      table.string('password').nullable().alter();
    }),
    knex.raw(
      'update users set ' +
        'role = (case when (establishment_id is null) then 1 else 0 end), ' +
        'activated_at = (case when (password is not null) then current_timestamp end)',
    ),
    knex.schema.alterTable('users', (table) => {
      table.integer('role').notNullable().alter();
    }),
    knex.schema.alterTable('housing', (table) => {
      table.integer('cadastral_classification').nullable().alter();
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.dropTable('auth_tokens'),
    knex.schema.alterTable('users', (table) => {
      table.dropColumn('role');
      table.dropColumn('activated_at');
    }),
  ]);
}
