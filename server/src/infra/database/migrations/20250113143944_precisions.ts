import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('precisions', (table) => {
    table.uuid('id').primary().notNullable();
    table.string('category').notNullable();
    table.string('label').notNullable();
    table.integer('order').notNullable();
    table.check('"order" >= 1');

    table.unique(['category', 'label']);
    table.unique(['category', 'order']);
  });

  await knex.schema.createTable('housing_precisions', (table) => {
    table.string('housing_geo_code').notNullable();
    table.uuid('housing_id').notNullable();
    table
      .foreign(['housing_geo_code', 'housing_id'])
      .references(['geo_code', 'id'])
      .inTable('fast_housing')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
    table
      .uuid('precision_id')
      .notNullable()
      .references('id')
      .inTable('precisions')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table.primary(['housing_geo_code', 'housing_id', 'precision_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('housing_precisions');
  await knex.schema.dropTable('precisions');
}
