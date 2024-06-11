import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.integer('beneficiary_count');
    }),
    knex.raw(
      'update housing set beneficiary_count = (select max(o.beneficiary_count) from owners o, owners_housing oh where o.id = oh.owner_id and housing.id = oh.housing_id)',
    ),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.dropColumn('beneficiary_count');
    }),
  ]);
}
