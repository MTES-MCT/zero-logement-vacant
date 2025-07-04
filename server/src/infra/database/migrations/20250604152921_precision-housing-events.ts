import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('precision_housing_events', (table) => {
    table
      .uuid('event_id')
      .notNullable()
      .references('id')
      .inTable('events')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');
    table.string('housing_geo_code').notNullable();
    table.uuid('housing_id').notNullable();
    table
      .foreign(['housing_geo_code', 'housing_id'])
      .references(['geo_code', 'id'])
      .inTable('fast_housing')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');
    table
      .uuid('precision_id')
      .nullable()
      .references('id')
      .inTable('precisions')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');

    table.index('event_id');
    // When one searches by housing
    table.index(['housing_geo_code', 'housing_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('precision_housing_events');
  if (hasTable) {
    await knex.schema.dropTable('precision_housing_events');
  }
}
