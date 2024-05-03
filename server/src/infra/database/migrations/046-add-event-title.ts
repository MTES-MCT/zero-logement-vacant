import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table: CreateTableBuilder) => {
    table.string('title').defaultTo(null);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table: CreateTableBuilder) => {
    table.dropColumn('title');
  });
}
