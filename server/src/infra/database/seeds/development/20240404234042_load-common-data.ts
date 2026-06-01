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

  await loadTable(knex, localitiesTable, path.join(DATA_DIR, 'localities.csv'), {
    conflictKey: 'geo_code',
    updateColumns: ['name', 'locality_kind', 'tax_kind', 'tax_rate']
  });

  await loadTable(knex, establishmentsTable, path.join(DATA_DIR, 'establishments.csv'), {
    conflictKey: 'siren',
    updateColumns: [
      'name', 'siret', 'localities_geo_code', 'kind', 'kind_admin_meta',
      'millesime', 'layer_geo_label', 'dep_code', 'dep_name',
      'reg_code', 'reg_name', 'source', 'updated_at'
    ],
    // available is managed by the establishments seed — force false on every load
    beforeUpsert: (client, tmp) => client.query(`UPDATE ${tmp} SET available = false`)
  });

  await knex.raw(`DELETE FROM ${establishmentsLocalitiesTable}`);
  await knex.raw(`
    INSERT INTO ${establishmentsLocalitiesTable} (locality_id, establishment_id)
    SELECT l.id, e.id
    FROM ${localitiesTable} l
    JOIN ${establishmentsTable} e ON l.geo_code = ANY(e.localities_geo_code)
    ON CONFLICT DO NOTHING
  `);
  console.log('Rebuilt establishments_localities.');

  console.log('Loaded common data.');
  console.timeEnd('20240404234042_load-common-data');
  console.log('\n');
}

interface LoadOptions {
  conflictKey: string;
  updateColumns: string[];
  beforeUpsert?: (client: any, tmpTable: string) => Promise<void>;
}

async function loadTable(
  knex: Knex,
  table: string,
  csvPath: string,
  { conflictKey, updateColumns, beforeUpsert }: LoadOptions
): Promise<void> {
  const tmp = `_tmp_${table}_`;
  const client = await knex.client.acquireConnection();

  try {
    await client.query(`CREATE TEMP TABLE ${tmp} (LIKE ${table})`);

    const copyStream = client.query(copyFrom(`COPY ${tmp} FROM STDIN WITH (FORMAT CSV, HEADER)`));
    await pipeline(createReadStream(csvPath), copyStream);

    if (beforeUpsert) {
      await beforeUpsert(client, tmp);
    }

    const updateSet = updateColumns.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    await client.query(`
      INSERT INTO ${table} SELECT * FROM ${tmp}
      ON CONFLICT (${conflictKey}) DO UPDATE SET ${updateSet}
    `);

    await client.query(`
      DELETE FROM ${table} WHERE ${conflictKey} NOT IN (SELECT ${conflictKey} FROM ${tmp})
    `);

    await client.query(`DROP TABLE ${tmp}`);

    const { rows } = await client.query(`SELECT COUNT(*) FROM ${table}`);
    console.log(`Loaded ${rows[0].count} rows into ${table}.`);
  } finally {
    await knex.client.releaseConnection(client);
  }
}
