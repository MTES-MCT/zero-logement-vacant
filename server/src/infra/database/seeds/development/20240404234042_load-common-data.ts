import { from as copyFrom } from 'pg-copy-streams';
import { Knex } from 'knex';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { establishmentsLocalitiesTable } from '~/repositories/establishmentLocalityRepository';
import { establishmentsTable } from '~/repositories/establishmentRepository';
import { localitiesTable } from '~/repositories/localityRepository';
import { NOTES_TABLE } from '~/repositories/noteRepository';
import { resetLinkTable } from '~/repositories/resetLinkRepository';
import { signupLinkTable } from '~/repositories/signupLinkRepository';

const DATA_DIR = path.join(import.meta.dirname, '..', '..', 'data', 'common');

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404234042_load-common-data');

  for (const table of [NOTES_TABLE, signupLinkTable, resetLinkTable]) {
    await knex.raw(`TRUNCATE TABLE ${table} CASCADE`);
    console.log(`Truncated table ${table}.`);
  }

  await knex.raw(`TRUNCATE TABLE ${localitiesTable} CASCADE`);
  await copyFromCsv(knex, localitiesTable, path.join(DATA_DIR, 'localities.csv'));

  await knex.raw(`TRUNCATE TABLE ${establishmentsTable} CASCADE`);
  await copyFromCsv(knex, establishmentsTable, path.join(DATA_DIR, 'establishments.csv'));
  await copyFromCsv(knex, establishmentsLocalitiesTable, path.join(DATA_DIR, 'establishments_localities.csv'));

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
