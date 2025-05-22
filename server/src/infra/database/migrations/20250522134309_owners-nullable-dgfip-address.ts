import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.setNullable('address_dgfip');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.dropNullable('address_dgfip');
  });
}
