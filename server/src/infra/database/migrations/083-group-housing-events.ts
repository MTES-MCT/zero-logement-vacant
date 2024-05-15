import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('group_housing_events', (table) => {
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
      .onDelete('RESTRICT');

    table
      .uuid('group_id')
      .references('id')
      .inTable('groups')
      .onUpdate('CASCADE')
      // Set to null if the group is removed because the event must remain.
      .onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('group_housing_events');
}
