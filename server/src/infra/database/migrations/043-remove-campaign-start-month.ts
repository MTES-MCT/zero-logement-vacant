import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.renameColumn('start_month', 'start_month_deprecated');
    table.string('start_month').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.renameColumn('start_month_deprecated', 'start_month');
  });
}
