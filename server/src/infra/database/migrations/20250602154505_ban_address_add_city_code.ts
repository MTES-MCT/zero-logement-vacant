import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ban_addresses', (table) => {
    table.string('city_code').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ban_addresses', (table) => {
    table.dropColumn('city_code');
  });
}
