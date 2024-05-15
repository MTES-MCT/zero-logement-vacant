import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_prospects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owner_prospects', (table) => {
    table.dropColumn('id');
  });
}
