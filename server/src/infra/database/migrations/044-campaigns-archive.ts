import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.timestamp('archived_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table: CreateTableBuilder) => {
    table.dropColumn('archived_at');
  });
}
