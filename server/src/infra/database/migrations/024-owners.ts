import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('owners_housing', (table) => {
      table.date('start_date');
      table.date('end_date');
      table.string('origin');
    }),
    knex.raw("update owners_housing set origin = 'Lovac'"),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.raw('delete from owners_housing where rank > 1'),
    knex.schema.alterTable('owners_housing', (table) => {
      table.dropColumn('start_date');
      table.dropColumn('end_date');
      table.dropColumn('origin');
    }),
  ]);
}
