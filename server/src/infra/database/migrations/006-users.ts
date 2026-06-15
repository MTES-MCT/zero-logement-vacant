import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('establishment_id').references('id').inTable('establishments');
      table.string('email').notNullable();
      table.string('password').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
    }),
    knex.schema.alterTable('campaigns', (table) => {
      table.uuid('created_by').references('id').inTable('users').notNullable();
    }),
    knex.schema.alterTable('events', (table) => {
      table.uuid('created_by').references('id').inTable('users').notNullable();
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('events', (table) => {
      table.dropColumn('created_by');
    }),
    knex.schema.alterTable('campaigns', (table) => {
      table.dropColumn('created_by');
    }),
    knex.schema.dropTable('users')
  ]);
}
