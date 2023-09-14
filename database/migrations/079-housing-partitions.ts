import { Knex } from 'knex';
import fp from 'lodash/fp';

exports.up = async (knex: Knex) => {
  async function createPartitions(from: number, to: number): Promise<void> {
    for (let i = from; i < to; i++) {
      const department = fp.padCharsStart('0', 2, i.toString(10));
      // const nextDepartment = fp.padCharsStart('0', 2, (i + 1).toString(10));
      await knex.schema.raw(`
        CREATE TABLE fast_housing_${department} PARTITION OF fast_housing
        FOR VALUES FROM ('${department}000') TO ('${department}999')
    `);
    }
  }

  await knex.schema.raw(
    'CREATE TABLE fast_housing (LIKE housing) PARTITION BY RANGE (geo_code)'
  );
  await createPartitions(1, 20);
  // Corse-du-Sud
  await knex.schema.raw(`
    CREATE TABLE fast_housing_2A PARTITION OF fast_housing
    FOR VALUES FROM ('2A000') TO ('2A999')
  `);
  // Haute-Corse
  await knex.schema.raw(`
    CREATE TABLE fast_housing_2B PARTITION OF fast_housing
    FOR VALUES FROM ('2B000') TO ('2B999')
  `);
  await createPartitions(21, 99);

  await knex.insert(knex.select().from('housing')).into('fast_housing');
  await knex.schema.alterTable('fast_housing', (table) => {
    table.primary(['geo_code', 'id']);
  });
};

exports.down = async (knex: Knex) => {
  await knex.schema.dropTable('fast_housing');
};
