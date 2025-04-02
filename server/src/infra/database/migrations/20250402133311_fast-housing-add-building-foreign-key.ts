import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table
      .string('building_id')
      .nullable()
      .references('id')
      .inTable('buildings')
      .onUpdate('CASCADE')
      .onDelete('SET NULL')
      .alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropForeign('building_id');
  });
}
