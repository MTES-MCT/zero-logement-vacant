import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('documents_housings', (table) => {
    table.uuid('document_id').notNullable();
    table.string('housing_geo_code').notNullable();
    table.uuid('housing_id').notNullable();

    table.primary(['document_id', 'housing_geo_code', 'housing_id']);
    table
      .foreign('document_id')
      .references('id')
      .inTable('documents')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.index(['housing_geo_code', 'housing_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('documents_housings');
}
