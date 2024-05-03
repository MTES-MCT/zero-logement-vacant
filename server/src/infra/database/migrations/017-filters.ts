import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.table('campaigns_housing', function (table) {
      table.index(['housing_id'], 'campaigns_housing_housing_id_idx');
    }),
    knex.schema.alterTable('localities', (table) => {
      table.string('locality_kind');
    }),
    knex.schema.createTable('buildings', (table) => {
      table.string('id').primary();
      table.integer('housing_count').notNullable();
      table.integer('vacant_housing_count').notNullable();
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('localities', (table) => {
      table.dropColumn('locality_kind');
    }),
    knex.schema.table('campaigns_housing', function (table) {
      table.dropIndex(['housing_id'], 'campaigns_housing_housing_id_idx');
    }),
    knex.schema.dropTable('buildings'),
  ]);
}
