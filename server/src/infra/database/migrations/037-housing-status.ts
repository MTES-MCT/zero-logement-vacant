import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex
      .table('housing')
      .update({
        status: 0,
        sub_status: null,
        precisions: null,
        vacancy_reasons: null,
      })
      .whereNotExists(function (whereBuilder: any) {
        whereBuilder
          .from('campaigns_housing')
          .whereRaw('housing_id = housing.id');
      }),
    knex.schema.alterTable('housing', (table) => {
      table.integer('status').defaultTo(0).alter();
    }),
  ]);
}

export async function down(): Promise<void> {}
