import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add epci column to user_perimeters table
  await knex.schema.alterTable('user_perimeters', (table) => {
    table.specificType('epci', 'TEXT[]').notNullable().defaultTo('{}');
  });

  // Index for efficient EPCI filtering
  await knex.raw(`
    CREATE INDEX idx_user_perimeters_epci ON user_perimeters USING GIN (epci);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_user_perimeters_epci;`);
  await knex.schema.alterTable('user_perimeters', (table) => {
    table.dropColumn('epci');
  });
}
