import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.dropColumns('kind', 'category', 'section');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('events', (table) => {
    table.string('kind').nullable();
    table.string('category').nullable();
    table.string('section').nullable();
  });
}
