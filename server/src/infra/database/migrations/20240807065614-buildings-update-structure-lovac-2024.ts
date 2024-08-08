import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('buildings', (table) => {
    table.integer('rent_housing_count').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('buildings', (table) => {
    table.dropColumn('rent_housing_count');
  });
}
