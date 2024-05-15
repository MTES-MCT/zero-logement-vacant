import path from 'path';
import fs from 'fs';
import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.raw(
      fs
        .readFileSync(
          path.join(__dirname, '..', 'procedures', '001-load-housing.sql'),
        )
        .toString(),
    ),
    knex.schema.alterTable('housing', (table: CreateTableBuilder) => {
      table.index(['local_id'], 'housing_local_id_idx');
      table.index(
        ['insee_code', 'data_years'],
        'housing_insee_code_data_years_idx',
      );
    }),
    knex.schema.alterTable('owners', (table: CreateTableBuilder) => {
      table.index(
        ['full_name', 'birth_date', 'raw_address'],
        'owners_full_name_birth_date_raw_address_idx',
      );
    }),
    knex.schema.alterTable('owners_housing', (table: CreateTableBuilder) => {
      table.index(
        ['housing_id', 'rank', 'owner_id'],
        'owners_housing_housing_id_rank_owner_id_idx',
      );
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.raw('DROP PROCEDURE load_housing(date_format text)'),
    knex.schema.raw(
      'DROP PROCEDURE load_owner (_full_name text, _administrator text, _birth_date date, _raw_address text[], _owner_kind text, _owner_kind_detail text, _housing_id uuid, _housing_geo_code text, _rank integer )',
    ),
    knex.schema.alterTable('housing', (table: CreateTableBuilder) => {
      table.dropIndex(['local_id'], 'housing_local_id_idx');
      table.dropIndex(
        ['insee_code', 'data_years'],
        'housing_insee_code_data_years_idx',
      );
    }),
    knex.schema.alterTable('owners', (table: CreateTableBuilder) => {
      table.dropIndex(
        ['full_name', 'birth_date', 'raw_address'],
        'owners_full_name_birth_date_raw_address_idx',
      );
    }),
    knex.schema.alterTable('owners_housing', (table: CreateTableBuilder) => {
      table.dropIndex(
        ['housing_id', 'rank', 'owner_id'],
        'owners_housing_housing_id_rank_owner_id_idx',
      );
    }),
  ]);
}
