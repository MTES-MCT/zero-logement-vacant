import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.renameColumn('raw_address', 'address_dgfip');
    table.renameColumn('longitude', 'longitude_dgfip');
    table.renameColumn('latitude', 'latitude_dgfip');
  });

  await knex.schema.alterTable('fast_housing', (table) => {
    // Should be notNullable but we need to fill it first
    table.specificType('data_file_years', 'text[]').nullable();
  });

  await knex.schema.alterTable('fast_housing', (table) => {
    table.string('geolocation').nullable();
    table.renameColumn('source', 'data_source');
    table.renameColumn('ownership_kind', 'condominium');
    table.renameColumn('occupancy_registered', 'occupancy_source');
    table.renameColumn('energy_consumption', 'energy_consumption_bdnb');
    table.renameColumn('energy_consumption_at', 'energy_consumption_at_bdnb');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.renameColumn('energy_consumption_at_bdnb', 'energy_consumption_at');
    table.renameColumn('energy_consumption_bdnb', 'energy_consumption');
    table.renameColumn('occupancy_source', 'occupancy_registered');
    table.renameColumn('data_source', 'source');
    table.renameColumn('condominium', 'ownership_kind');
    table.dropColumn('geolocation');
    table.dropColumn('data_file_years');
  });

  await knex.schema.alterTable('fast_housing', (table) => {
    table.renameColumn('latitude_dgfip', 'latitude');
    table.renameColumn('longitude_dgfip', 'longitude');
    table.renameColumn('address_dgfip', 'raw_address');
  });
}
