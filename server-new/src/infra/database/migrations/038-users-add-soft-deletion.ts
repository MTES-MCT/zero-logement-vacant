import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table: CreateTableBuilder) => {
    table.timestamp('deleted_at').nullable().defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table: CreateTableBuilder) => {
    table.dropColumn('deleted_at');
  });
}
