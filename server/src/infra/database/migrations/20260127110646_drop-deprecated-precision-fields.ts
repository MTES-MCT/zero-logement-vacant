import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropColumn('deprecated_precisions');
    table.dropColumn('deprecated_vacancy_reasons');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.specificType('deprecated_precisions', 'text[]');
    table.specificType('deprecated_vacancy_reasons', 'text[]');
  });
}
