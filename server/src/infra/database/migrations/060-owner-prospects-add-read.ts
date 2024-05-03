import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_prospects', (table) => {
    table.boolean('read').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_prospects', (table) => {
    table.dropColumn('read');
  });
}
