import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table
      .renameColumn('precisions', 'deprecated_precisions')
      .comment('Replaced by the table "housing_precisions"');
    table
      .renameColumn('vacancy_reasons', 'deprecated_vacancy_reasons')
      .comment('Replaced by the table "housing_precisions"');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.renameColumn('deprecated_precisions', 'precisions');
    table.renameColumn('deprecated_vacancy_reasons', 'vacancy_reasons');
  });
}
