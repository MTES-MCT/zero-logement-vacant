import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTable('conflicts_housing_owners');
  await knex.schema.dropTable('conflicts_owners');
  await knex.schema.dropTable('conflicts');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('conflicts', (table) => {
    table.uuid('id').primary();
    table.timestamp('created_at').notNullable();
  });
  await knex.schema.createTable('conflicts_housing_owners', (table) => {
    table.uuid('conflict_id').notNullable();
    table.uuid('housing_id').notNullable();
    table.string('housing_geo_code').notNullable();
    table.uuid('existing_owner_id').nullable();
    table.uuid('replacement_owner_id').nullable();

    table
      .foreign('conflict_id')
      .references('id')
      .inTable('conflicts')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .foreign('existing_owner_id')
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .foreign(['housing_geo_code', 'housing_id'])
      .references(['geo_code', 'id'])
      .inTable('fast_housing')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .foreign('replacement_owner_id')
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });
  await knex.schema.createTable('conflicts_owners', (table) => {
    table.uuid('conflict_id').notNullable();
    table.uuid('owner_id').notNullable();
    table.jsonb('replacement').notNullable();

    table
      .foreign('conflict_id')
      .references('id')
      .inTable('conflicts')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .foreign('owner_id')
      .references('id')
      .inTable('owners')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });
}
