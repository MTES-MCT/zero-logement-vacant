import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.string('building_location');
      table.integer('rental_value');
      table.string('ownership_kind');
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.dropColumn('building_location');
      table.dropColumn('rental_value');
      table.dropColumn('ownership_kind');
    }),
  ]);
}
