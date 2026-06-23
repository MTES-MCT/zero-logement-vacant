import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.boolean('do_not_contact').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.dropColumn('do_not_contact');
  });
}
