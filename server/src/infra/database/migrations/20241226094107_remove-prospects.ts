import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('prospects');
  await knex.schema.dropTable('owner_prospects');
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('prospects', (table) => {
      table.string('email').primary();
      table.integer('establishment_siren');
      table.timestamp('last_account_request_at').notNullable();
      table.boolean('has_account').notNullable().defaultTo(false);
      table.boolean('has_commitment').notNullable().defaultTo(false);
    }),
    knex.schema.createTable('owner_prospects', (table) => {
      table.uuid('id').primary();
      table.string('email').notNullable();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('address').notNullable();
      table.string('geo_code').notNullable();
      table.string('phone').notNullable();
      table.string('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('invariant');
      table.boolean('call_back').notNullable().defaultTo(false);
      table.boolean('read').notNullable().defaultTo(false);
    }),
  ]);
}

