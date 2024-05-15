import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.timestamp('confirmed_at');
  });
  await knex
    .table('campaigns')
    .whereNotNull('sent_at')
    .update('confirmed_at', new Date());
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.dropColumn('confirmed_at');
  });
}
