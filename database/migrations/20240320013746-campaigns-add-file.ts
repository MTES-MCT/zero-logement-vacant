import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.string('file').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('file');
  });
}
