import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.setNullable('rooms_count');
    table.setNullable('living_area');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropNullable('rooms_count');
    table.dropNullable('living_area');
  });
}
