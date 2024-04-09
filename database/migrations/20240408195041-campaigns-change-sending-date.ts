import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('sent_at');
  });
  await knex.schema.alterTable('campaigns', (table) => {
    table.renameColumn('sending_date', 'sent_at');
  });
  await knex.schema.alterTable('campaigns', (table) => {
    table.datetime('sent_at').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns', (table) => {
    table.renameColumn('sent_at', 'sending_date');
  });
  await knex.schema.alterTable('campaigns', (table) => {
    table.datetime('sent_at');
  });
}
