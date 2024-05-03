import { Knex } from 'knex';

const COLS = ['housing_id', 'rank'];
const INDEX = 'owners_housing_housing_rank_idx';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    create unique index owners_housing_housing_rank_idx on owners_housing (housing_id, rank)
    where (rank > 0);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('owners_housing', (table) => {
    table.dropIndex(COLS, INDEX);
  });
}
