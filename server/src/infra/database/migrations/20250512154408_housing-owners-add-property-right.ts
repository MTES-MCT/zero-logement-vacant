import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners_housing', (table) => {
    table.string('property_right').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners_housing', (table) => {
    table.dropColumn('property_right');
  });
}
