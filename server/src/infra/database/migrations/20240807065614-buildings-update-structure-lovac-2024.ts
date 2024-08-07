import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('buildings', (table) => {
    table.integer('rent_housing_count').nullable();
  });
  await knex('buildings').update({ rent_housing_count: 0 });
  await knex.schema.alterTable('buildings', (table) => {
    table.dropNullable('rent_housing_count');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('buildings', (table) => {
    table.dropColumn('rent_housing_count');
  });
}
