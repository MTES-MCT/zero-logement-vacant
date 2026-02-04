import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('housing_document_events', (table) => {
    table.uuid('event_id').primary().references('id').inTable('events').onDelete('CASCADE');
    table.string('housing_geo_code').notNullable();
    table.uuid('housing_id').notNullable();
    table.uuid('document_id').notNullable().references('id').inTable('documents').onDelete('CASCADE');

    // Composite foreign key for housing
    table.foreign(['housing_geo_code', 'housing_id'])
      .references(['geo_code', 'id'])
      .inTable('fast_housing')
      .onDelete('CASCADE');

    table.index(['housing_geo_code', 'housing_id']);
    table.index('document_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('housing_document_events');
}
