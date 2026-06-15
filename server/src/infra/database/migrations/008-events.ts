import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('events', (table) => {
      table.uuid('campaign_id').references('id').inTable('campaigns');
      table.uuid('housing_id').references('id').inTable('housing').alter();
      table.uuid('owner_id').references('id').inTable('owners').alter();
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('events', (table) => {
      table.dropColumn('campaign_id');
      table.dropForeign('housing_id');
      table.dropForeign('owner_id');
    })
  ]);
}
