import { Knex } from 'knex';
import CreateTableBuilder = Knex.CreateTableBuilder;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(
    'establishments',
    (table: CreateTableBuilder) => {
      table.string('campaign_intent').nullable().defaultTo(null);
    },
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(
    'establishments',
    (table: CreateTableBuilder) => {
      table.dropColumn('campaign_intent');
    },
  );
}
