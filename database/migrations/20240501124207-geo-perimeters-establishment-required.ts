import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('geo_perimeters', (table) => {
    table.dropNullable('establishment_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('geo_perimeters', (table) => {
    table.setNullable('establishment_id');
  });
}
