import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('housing_owner_events', (table) => {
    table
      .uuid('event_id')
      .notNullable()
      .references('id')
      .inTable('events')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table.string('housing_geo_code').notNullable();
    table.uuid('housing_id').notNullable();
    table
      .foreign(['housing_geo_code', 'housing_id'])
      .references(['geo_code', 'id'])
      .inTable('fast_housing')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .uuid('owner_id')
      .nullable()
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');

    table.index('event_id');
    table.index(['housing_geo_code', 'housing_id']);
    // Index for owner_id is not necessary yet
    // because it is not used in queries for the moment
  });
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('housing_owner_events');
  if (exists) {
    await knex.schema.dropTable('housing_owner_events');
  }
}
