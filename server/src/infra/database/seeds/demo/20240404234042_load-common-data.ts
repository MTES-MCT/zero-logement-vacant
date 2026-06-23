import { createReadStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import async from 'async';
import { Knex } from 'knex';
import { from as copyFrom } from 'pg-copy-streams';

import { establishmentsLocalitiesTable } from '~/repositories/establishmentLocalityRepository';
import { establishmentsTable } from '~/repositories/establishmentRepository';
import { localitiesTable } from '~/repositories/localityRepository';

const DATA_DIR = path.join(import.meta.dirname, '..', '..', 'data', 'common');

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404234042_load-common-data');

  const tables = [
    localitiesTable,
    establishmentsTable,
    establishmentsLocalitiesTable
  ];
  await async.forEachSeries(tables, async (table) => {
    await knex.raw(`TRUNCATE TABLE ${table} CASCADE`);
    await copyFromCsv(knex, table, path.join(DATA_DIR, `${table}.csv`));
  });

  console.log('Loaded common data.');
  console.timeEnd('20240404234042_load-common-data');
  console.log('\n');
}

async function copyFromCsv(
  knex: Knex,
  table: string,
  csvPath: string
): Promise<void> {
  const client = await knex.client.acquireConnection();
  try {
    const copyStream = client.query(
      copyFrom(`COPY ${table} FROM STDIN WITH (FORMAT CSV, HEADER)`)
    );
    await pipeline(createReadStream(csvPath), copyStream);
    const { rows } = await client.query(`SELECT COUNT(*) FROM ${table}`);
    console.log(`Loaded ${rows[0].count} rows into ${table}.`);
  } finally {
    await knex.client.releaseConnection(client);
  }
}
