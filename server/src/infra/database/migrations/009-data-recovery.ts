import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.specificType('vacancy_reasons', 'text[]');
    }),
    knex.schema.alterTable('events', (table) => {
      table.text('content').alter();
      table.text('contact_kind');
    }),
    knex.schema.alterTable('campaigns', (table) => {
      table.specificType('recovery_id', 'text');
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('housing', (table) => {
      table.dropColumn('vacancy_reasons');
    }),
    knex.schema.alterTable('events', (table) => {
      table.dropColumn('contact_kind');
    }),
    knex.schema.alterTable('campaigns', (table) => {
      table.dropColumn('recovery_id');
    })
  ]);
}
