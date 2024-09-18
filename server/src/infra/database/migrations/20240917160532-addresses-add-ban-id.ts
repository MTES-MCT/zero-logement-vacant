import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ban_addresses', (table) => {
    table
      .string('ban_id')
      .nullable()
      .comment('The identifier returned by the BAN API');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ban_addresses', (table) => {
    table.dropColumn('ban_id');
  });
}
