import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    /** We need to store this as String or Datetime because Date is parsed using
     ** `new Date(year, month, day)` which returns a Date in the local timezone
     ** instead of UTC. Thus, `new Date('2020-01-01')` returns 2020-01-01 00:00:00 UTC
     ** while `new Date(2020, 0, 1)` returns 2020-01-01 00:00:00 GMT+1 (for CET),
     ** which is indeed 2019-12-31 23:00:00 UTC...
     * This is mostly caused by node-postgres.
     * @see https://node-postgres.com/features/types#date--timestamp--timestamptz
     * @see node_modules/postgres-date/index.js#75
     */
    table.datetime('birth_date').alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('owners', (table) => {
    table.date('birth_date').alter();
  });
}
