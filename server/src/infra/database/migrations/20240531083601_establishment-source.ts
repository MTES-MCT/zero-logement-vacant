import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table.string('source').defaultTo('seed').notNullable();
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('establishments', (table) => {
    table.dropColumn('source');
  });
}

