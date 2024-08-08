import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('owners', (table) => {
    table.renameColumn('dgfip_address', 'address_dgfip');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('owners', (table) => {
    table.renameColumn('address_dgfip', 'dgfip_address');
  });
}
