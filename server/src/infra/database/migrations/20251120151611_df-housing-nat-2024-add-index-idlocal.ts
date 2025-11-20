import type { Knex } from 'knex';

const TABLE = 'df_housing_nat_2024';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE, (table) => {
    table.index('idlocal');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE, (table) => {
    table.dropIndex('idlocal');
  });
}
