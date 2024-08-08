import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners_housing', (table) => {
    table.string('idprocpte').nullable();
    table.string('idprodroit').nullable();
    table.string('locprop').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners_housing', (table) => {
    table.dropColumn('idprocpte');
    table.dropColumn('idprodroit');
    table.dropColumn('locprop');
  });
}
