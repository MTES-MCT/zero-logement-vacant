import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.dropIndex(
      ['full_name', 'dgfip_address'],
      'owners_full_name_raw_address_idx'
    );
    table.dropIndex(
      ['full_name', 'dgfip_address', 'birth_date'],
      'owners_full_name_birth_date_raw_address_idx'
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    CREATE UNIQUE INDEX owners_full_name_raw_address_idx ON owners (full_name, dgfip_address, (birth_date IS NULL)) WHERE birth_date IS NULL
  `);
  await knex.schema.raw(`
    CREATE UNIQUE INDEX owners_full_name_birth_date_raw_address_idx ON owners (full_name, dgfip_address, birth_date);
  `);
}
