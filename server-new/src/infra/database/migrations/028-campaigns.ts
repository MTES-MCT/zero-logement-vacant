import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns', (table) => {
      table.unique(['establishment_id', 'campaign_number', 'reminder_number']);
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('campaigns', (table) => {
      table.dropUnique([
        'establishment_id',
        'campaign_number',
        'reminder_number',
      ]);
    }),
  ]);
}
