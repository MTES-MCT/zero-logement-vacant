import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('owners', (table) => {
      table.string('house_number');
      table.string('street');
      table.string('postal_code');
      table.string('city');
    })
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('owners', (table) => {
      table.dropColumn('house_number');
      table.dropColumn('street');
      table.dropColumn('postal_code');
      table.dropColumn('city');
    })
  ]);
}
