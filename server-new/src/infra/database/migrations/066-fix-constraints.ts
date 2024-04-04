import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.dropIndex(['local_id'], 'housing_local_id_idx');
      table.unique(['local_id'], { indexName: 'housing_local_id_idx' });
    }),
    knex.schema.alterTable('owners', (table) => {
      table.dropIndex(
        ['full_name', 'birth_date', 'raw_address'],
        'owners_full_name_birth_date_raw_address_idx',
      );
    }),
  ]);
  await knex.schema.raw(`
    CREATE UNIQUE INDEX owners_full_name_raw_address_idx ON owners (full_name, raw_address, (birth_date IS NULL)) WHERE birth_date IS NULL
  `);
  await knex.schema.raw(`
    CREATE UNIQUE INDEX owners_full_name_birth_date_raw_address_idx ON owners (full_name, raw_address, birth_date);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('owners', (table) => {
      table.dropIndex(
        ['full_name', 'raw_address', 'birth_date'],
        'owners_full_name_birth_date_raw_address_idx',
      );
    }),
    knex.schema.alterTable('housing', (table) => {
      table.dropUnique(['local_id'], 'housing_local_id_idx');
      table.index(['local_id'], 'housing_local_id_idx');
    }),
  ]);
  await knex.schema.raw('DROP INDEX owners_full_name_raw_address_idx');
  await knex.schema.alterTable('owners', (table) => {
    table.index(
      ['full_name', 'birth_date', 'raw_address'],
      'owners_full_name_birth_date_raw_address_idx',
    );
  });
}
