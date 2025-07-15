import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.setNullable('first_name');
    table.setNullable('last_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.string('first_name').notNullable().defaultTo('').alter();
    table.string('last_name').notNullable().defaultTo('').alter();
  });
}
