import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_perimeters', (table) => {
    table.uuid('user_id').primary();
    table.specificType('geo_codes', 'TEXT[]').notNullable().defaultTo('{}');
    table.specificType('departments', 'TEXT[]').notNullable().defaultTo('{}');
    table.specificType('regions', 'TEXT[]').notNullable().defaultTo('{}');
    table.boolean('fr_entiere').notNullable().defaultTo(false);
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');
  });

  // Index for efficient filtering
  await knex.raw(`
    CREATE INDEX idx_user_perimeters_geo_codes ON user_perimeters USING GIN (geo_codes);
  `);
  await knex.raw(`
    CREATE INDEX idx_user_perimeters_departments ON user_perimeters USING GIN (departments);
  `);
  await knex.raw(`
    CREATE INDEX idx_user_perimeters_regions ON user_perimeters USING GIN (regions);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_perimeters');
}
