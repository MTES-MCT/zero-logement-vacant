import { Knex } from 'knex';

const COLS = ['housing_id', 'rank'];
const INDEX = 'owners_housing_housing_rank_idx';

exports.up = function (knex: Knex) {
  return knex.raw(`
    create unique index owners_housing_housing_rank_idx on owners_housing (housing_id, rank)
    where (rank > 0);
  `);
};

exports.down = function (knex: Knex) {
  return knex.schema.table('owners_housing', (table) => {
    table.dropIndex(COLS, INDEX);
  });
};
