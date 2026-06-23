import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await Promise.all([
    knex.schema.alterTable('owners', (table) => {
      table.string('owner_kind').nullable().alter();
      table.string('owner_kind_detail').nullable().alter();
    }),
    knex.schema.alterTable('owners_housing', (table) => {
      table.integer('rank');
    }),
    knex.raw("update owners set raw_address = array_remove(raw_address, '')"),
    knex.raw('update owners_housing set rank = 1')
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await Promise.all([
    knex.raw('delete from owners_housing where rank > 1'),
    knex.schema.alterTable('owners_housing', (table) => {
      table.dropColumn('rank');
    })
  ]);
}
