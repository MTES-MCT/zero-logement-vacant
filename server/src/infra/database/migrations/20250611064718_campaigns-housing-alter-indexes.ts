import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns_housing', (table) => {
    table.dropIndex('housing_id', 'campaigns_housing_housing_id_idx');
    table.index(['housing_geo_code', 'housing_id']);

    table.dropForeign('campaign_id');
    table
      .foreign('campaign_id')
      .references('id')
      .inTable('campaigns')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.index('campaign_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('campaigns_housing', (table) => {
    table.dropForeign('campaign_id');
    table
      .foreign('campaign_id')
      .references('id')
      .inTable('campaigns')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    table.dropIndex(['housing_geo_code', 'housing_id']);
    table.index('housing_id');
  });
}
