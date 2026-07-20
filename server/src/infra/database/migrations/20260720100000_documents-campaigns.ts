import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('documents_campaigns', (table) => {
    table.uuid('document_id').notNullable();
    table.uuid('campaign_id').notNullable();

    table.primary(['document_id', 'campaign_id']);
    table
      .foreign('document_id')
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
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
  await knex.schema.dropTable('documents_campaigns');
}
