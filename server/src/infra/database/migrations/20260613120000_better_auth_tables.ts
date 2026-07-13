import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_users', (table) => {
    table
      .uuid('id')
      .primary()
      .references('id')
      .inTable('users')
      .onDelete('cascade');
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.string('image').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('session', (table) => {
    table.string('id').primary();
    table.timestamp('expires_at').notNullable();
    table.string('token').notNullable().unique();
    table.string('ip_address').nullable();
    table.string('user_agent').nullable();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('auth_users')
      .onDelete('cascade');
    // ZLV additionalFields
    table
      .uuid('active_establishment_id')
      .nullable()
      .references('id')
      .inTable('establishments')
      .onDelete('set null');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('account', (table) => {
    table.string('id').primary();
    table.string('account_id').notNullable();
    table.string('provider_id').notNullable();
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('auth_users')
      .onDelete('cascade');
    table.text('access_token').nullable();
    table.text('refresh_token').nullable();
    table.text('id_token').nullable();
    table.timestamp('access_token_expires_at').nullable();
    table.timestamp('refresh_token_expires_at').nullable();
    table.text('scope').nullable();
    table.text('password').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('verification', (table) => {
    table.string('id').primary();
    table.string('identifier').notNullable();
    table.string('value').notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);
  });

  // The legacy hash is read once by the manual backfill, then credentials are
  // owned exclusively by Better Auth's `account` table. New users therefore
  // no longer need a duplicate password in the domain table.
  await knex.schema.alterTable('users', (table) => {
    table.string('password').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex('users').whereNull('password').update({ password: '' });
  await knex.schema.alterTable('users', (table) => {
    table.string('password').notNullable().alter();
  });
  await knex.schema.dropTableIfExists('verification');
  await knex.schema.dropTableIfExists('account');
  await knex.schema.dropTableIfExists('session');
  await knex.schema.dropTableIfExists('auth_users');
}
