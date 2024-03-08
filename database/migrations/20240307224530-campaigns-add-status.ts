import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.string('status');
  });

  // Restore data
  await knex('campaigns').whereNull('confirmed_at').update({ status: 'draft' });

  await knex.schema.alterTable('campaigns', (table) => {
    table.string('status').notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('status');
  });
}
