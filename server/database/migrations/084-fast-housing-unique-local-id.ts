import { Knex } from 'knex';

exports.up = async (knex: Knex) => {
  await knex.schema.alterTable('fast_housing', (table) => {
    // Must include all partitioned columns
    table.unique(['geo_code', 'local_id'], { useConstraint: true });
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.alterTable('fast_housing', (table) => {
    table.dropUnique(['geo_code', 'local_id']);
  });
};
