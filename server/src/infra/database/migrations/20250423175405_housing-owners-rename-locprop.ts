import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('owners_housing', (table) => {
    table.renameColumn('locprop', 'locprop_source');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('owners_housing', (table) => {
    table.renameColumn('locprop_source', 'locprop');
  });
}
