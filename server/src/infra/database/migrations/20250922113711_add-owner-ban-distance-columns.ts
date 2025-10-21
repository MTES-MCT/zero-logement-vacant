import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners_housing', (table) => {
    table.integer('locprop_relative_ban').nullable();
    table.integer('locprop_distance_ban').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners_housing', (table) => {
    table.dropColumn('locprop_relative_ban');
    table.dropColumn('locprop_distance_ban');
  });
}