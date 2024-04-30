import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.string('status');
  });

  // Restore data
  await knex('campaigns').whereNull('sent_at').update({ status: 'draft' });
  await knex('campaigns')
    .whereNotNull('sent_at')
    .whereNull('archived_at')
    .update({ status: 'in-progress' });
  await knex('campaigns')
    .whereNotNull('archived_at')
    .update({ status: 'archived' });

  await knex.schema.alterTable('campaigns', (table) => {
    table.string('status').notNullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('status');
  });
}
