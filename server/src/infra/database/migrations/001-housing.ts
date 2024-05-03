import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'),
    knex.schema.createTable('housing', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('invariant').notNullable();
      table.string('local_id').notNullable();
      table.string('building_id').notNullable();
      table.specificType('raw_address', 'text[]').notNullable();
      table.string('insee_code').notNullable();
      table.string('house_number');
      table.string('street');
      table.string('postal_code');
      table.string('city');
      table.double('latitude').notNullable();
      table.double('longitude').notNullable();
      table.integer('cadastral_classification').notNullable();
      table.boolean('uncomfortable').notNullable();
      table.integer('vacancy_start_year').notNullable();
      table.string('housing_kind').notNullable();
      table.integer('rooms_count').notNullable();
      table.integer('living_area').notNullable();
      table.string('cadastral_reference').notNullable();
      table.integer('building_year');
      table.date('mutation_date').notNullable();
      table.boolean('taxed').notNullable();
    }),
    knex.schema.table('housing', function (table) {
      table.index(['insee_code'], 'housing_insee_code_idx');
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.dropTable('housing'),
    knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp";'),
  ]);
}
