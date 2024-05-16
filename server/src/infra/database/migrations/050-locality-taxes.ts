import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('localities', (table) => {
    table.string('tax_kind').notNullable().defaultTo('');
    table.float('tax_rate');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('localities', (table) => {
    table.dropColumns('tax_kind', 'tax_rate');
  });
}
