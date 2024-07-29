import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropColumn('longitude');
    table.dropColumn('latitude');
    table.dropColumn('address');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.double('longitude').nullable();
    table.double('latitude').nullable();
    table.string('address').nullable();
  });
}
