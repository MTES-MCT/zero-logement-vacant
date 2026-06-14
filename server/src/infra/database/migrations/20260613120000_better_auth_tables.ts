import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_users', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.boolean('email_verified').notNullable().defaultTo(false);
    table.string('image').nullable();
    // ZLV additionalFields (see server/src/infra/auth.ts user.additionalFields)
    table.string('first_name').nullable();
    table.string('last_name').nullable();
    table.string('role').notNullable().defaultTo('usual');
    table.string('phone').nullable();
    table.string('position').nullable();
    table.string('time_per_week').nullable();
    table.string('kind').nullable();
    table.timestamp('activated_at').nullable();
    table.timestamp('last_authenticated_at').nullable();
    table.timestamp('suspended_at').nullable();
    table.string('suspended_cause').nullable();
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('session', (table) => {
    table.string('id').primary();
    table.timestamp('expires_at').notNullable();
    table.string('token').notNullable().unique();
    table.string('ip_address').nullable();
    table.string('user_agent').nullable();
    table
      .string('user_id')
      .notNullable()
      .references('id')
      .inTable('auth_users')
      .onDelete('cascade');
    // ZLV additionalFields
    table.string('active_establishment_id').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('account', (table) => {
    table.string('id').primary();
    table.string('account_id').notNullable();
    table.string('provider_id').notNullable();
    table
      .string('user_id')
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
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('verification');
  await knex.schema.dropTableIfExists('account');
  await knex.schema.dropTableIfExists('session');
  await knex.schema.dropTableIfExists('auth_users');
}
