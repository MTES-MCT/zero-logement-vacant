import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_prospects', (table) => {
    table.boolean('call_back').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_prospects', (table) => {
    table.dropColumn('call_back');
  });
}
