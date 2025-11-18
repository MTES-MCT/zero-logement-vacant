import type { Knex } from 'knex';

const TABLE = 'owners';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE, (table) => {
    table.dropColumn('owner_kind_detail');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(TABLE, (table) => {
    table.string('owner_kind_detail').nullable();
  });
}
