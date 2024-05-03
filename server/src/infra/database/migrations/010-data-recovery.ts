import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.specificType('data_years', 'integer[]').defaultTo('{2021}');
      table.string('building_id').nullable().alter();
      table.boolean('taxed').nullable().alter();
      table.date('mutation_date').nullable().alter();
      table.double('latitude').nullable().alter();
      table.double('longitude').nullable().alter();
    }),
    knex.schema.alterTable('campaigns', (table) => {
      table.integer('kind').alter();
      table.renameColumn('kind', 'reminder_number');
    }),
    knex.schema.alterTable('campaigns_housing', (table) => {
      table.string('advice');
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns', (table) => {
      table.renameColumn('reminder_number', 'kind');
    }),
    knex.schema.alterTable('campaigns_housing', (table) => {
      table.dropColumn('advice');
    }),
    knex.schema.alterTable('housing', (table) => {
      table.dropColumn('data_years');
    }),
  ]);
}
