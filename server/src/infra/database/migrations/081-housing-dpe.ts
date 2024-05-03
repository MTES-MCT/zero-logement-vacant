import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropColumn('energy_consumption_worst');
    table.timestamp('energy_consumption_at');
    table.string('building_group_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.string('energy_consumption_worst');
    table.dropColumn('energy_consumption_at');
    table.dropColumn('building_group_id');
  });
}
