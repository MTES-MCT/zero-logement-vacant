import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.renameColumn('start_month', 'start_month_deprecated');
    table.string('start_month').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.renameColumn('start_month_deprecated', 'start_month');
  });
}
