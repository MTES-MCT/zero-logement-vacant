import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('owner_matches', function (table) {
    table.index('owner_id', 'idx_owner_id');
  }),
  await knex.schema.table('owners_housing', function (table) {
    table.index('end_date', 'idx_end_date');
  }),
  await knex.schema.table('owners_housing', function (table) {
    table.index('rank', 'idx_rank');
  }),
  await knex.schema.table('ban_addresses', function (table) {
    table.index('address_kind', 'idx_ban_addresses');
  }),
  await knex.schema.table('fast_housing', function (table) {
    table.index('plot_id', 'idx_housing_plot_id');
  }),
  await knex.schema.table('fast_housing', function (table) {
    table.index('geo_code', 'idx_housing_geo_code');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('owner_matches', function (table) {
    table.dropIndex('owner_id', 'idx_owner_id');
  }),
  await knex.schema.table('owners_housing', function (table) {
    table.dropIndex('end_date', 'idx_end_date');
  }),
  await knex.schema.table('owners_housing', function (table) {
    table.dropIndex('rank', 'idx_rank');
  }),
  await knex.schema.table('ban_addresses', function (table) {
    table.dropIndex('address_kind', 'idx_ban_addresses');
  }),
  await knex.schema.table('fast_housing', function (table) {
    table.dropIndex('plot_id', 'idx_housing_plot_id');
  }),
  await knex.schema.table('fast_housing', function (table) {
    table.dropIndex('geo_code', 'idx_housing_geo_code');
  });
}
