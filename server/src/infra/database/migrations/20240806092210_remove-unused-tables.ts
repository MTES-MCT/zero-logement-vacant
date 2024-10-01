import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('old_housing');
  await knex.schema.dropTableIfExists('old_events');
  await knex.schema.dropTableIfExists('housing');
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.createTable('old_housing', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('invariant').notNullable();
      table.string('local_id').notNullable();
      table.string('building_id').notNullable();
      table.specificType('raw_address', 'text[]').notNullable();
      table.string('geo_code').notNullable();
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
      table.specificType('vacancy_reasons', 'text[]');
      table.specificType('data_years', 'integer[]').defaultTo('{2021}');
      table.integer('beneficiary_count');
      table.string('building_location');
      table.integer('rental_value');
      table.string('ownership_kind');
      table.integer('status');
      table.string('sub_status');
      table.string('precisions');
      table.string('energy_consumption');
      table.string('energy_consumption_worst');
      table.string('occupancy').notNullable().defaultTo('V');
      table.unique(['local_id'], { indexName: 'old_housing_local_id_idx' });
      table.index(
        ['geo_code', 'data_years'],
        'old_housing_geo_code_data_years_idx'
      );
      table.index(['geo_code'], 'housing_geo_code_idx');
    }),
    knex.schema.createTable('housing', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.string('invariant').nullable();
      table.string('local_id').notNullable();
      table.string('building_id').nullable();
      table.specificType('raw_address', 'text[]').notNullable();
      table.string('geo_code').notNullable();
      table.double('latitude').nullable();
      table.double('longitude').nullable();
      table.integer('cadastral_classification').nullable();
      table.boolean('uncomfortable').notNullable();
      table.integer('vacancy_start_year').nullable();
      table.string('housing_kind').notNullable();
      table.integer('rooms_count').notNullable();
      table.integer('living_area').notNullable();
      table.string('cadastral_reference').notNullable();
      table.integer('building_year');
      table.date('mutation_date');
      table.boolean('taxed');
      table.specificType('vacancy_reasons', 'text[]');
      table.specificType('data_years', 'integer[]').defaultTo('{2021}');
      table.integer('beneficiary_count');
      table.string('building_location');
      table.integer('rental_value');
      table.string('ownership_kind');
      table.integer('status');
      table.string('sub_status');
      table.string('precisions');
      table.string('energy_consumption');
      table.string('energy_consumption_worst');
      table.string('occupancy_registered').notNullable().defaultTo('V');
      table.string('occupancy_intended');
      table.string('occupancy').notNullable().defaultTo('V');
      table.string('plot_id');
      table.unique(['local_id'], { indexName: 'housing_local_id_idx' });
      table.index(
        ['geo_code', 'data_years'],
        'housing_geo_code_data_years_idx'
      );
      table.index(['geo_code'], 'housing_geo_code_idx');
    }),
    knex.schema.createTable('old_events', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('campaign_id').references('id').inTable('campaigns');
      table.uuid('housing_id').references('id').inTable('housing');
      table.uuid('owner_id').references('id').inTable('owners');
      table.string('kind').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.string('content');
      table.text('contact_kind');
      table.string('title').defaultTo(null);
    })
  ]);
}
