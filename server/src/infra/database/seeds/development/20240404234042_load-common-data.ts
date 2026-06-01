import { Knex } from 'knex';
import { exec } from 'node:child_process';
import path from 'node:path';
import pMap from 'p-map';

import config from '~/infra/config';
import { NOTES_TABLE } from '~/repositories/noteRepository';
import { resetLinkTable } from '~/repositories/resetLinkRepository';
import { signupLinkTable } from '~/repositories/signupLinkRepository';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404234042_load-common-data');

  // These tables have no seed coverage — clear them upfront.
  // Establishments and localities are NOT truncated: the SQL scripts below are
  // fully idempotent (ON CONFLICT DO UPDATE + stale-row DELETE), so wiping
  // them here (and cascade-deleting users) is unnecessary.
  for (const table of [NOTES_TABLE, signupLinkTable, resetLinkTable]) {
    await knex.raw(`TRUNCATE TABLE ${table} CASCADE`);
    console.log(`Truncated table ${table}.`);
  }

  const base = path.join(import.meta.dirname, '..', '..');

  const script001 = {
    script: path.join('scripts', '001-load-establishments_com_epci_reg_dep.sql'),
    data: path.join('data', 'common', 'com_epci_dep_reg.csv')
  };
  const dependentScripts = [
    {
      script: path.join('scripts', '002-load-establishments_direction_territoriale.sql'),
      data: path.join('data', 'common', 'direction_territoriale.csv')
    },
    {
      script: path.join('scripts', '003-load-establishment_kinds.sql'),
      data: path.join('data', 'common', 'nature_juridique.csv')
    },
    {
      script: path.join('scripts', '006-load-locality-taxes.sql'),
      data: path.join('data', 'common', 'taxe.csv')
    }
  ];

  await load(script001.script, script001.data, base);
  await pMap(dependentScripts, ({ script, data }) => load(script, data, base));

  console.log('Loaded common data.');
  console.timeEnd('20240404234042_load-common-data');
  console.log('\n')
}

async function load(script: string, data: string, cwd: string): Promise<void> {
  const command = `psql ${config.db.url} -f ${script} -v filePath=${data} -v dateFormat="'MM/DD/YY/'" -v ON_ERROR_STOP=1`;
  console.info(`Executing ${command}`);
  await new Promise<void>((resolve, reject) => {
    exec(
      command,
      { cwd },
      (error, stdout, stderr) => {
        if (error) {
          return reject(error ?? stderr);
        }

        if (stderr) {
          console.warn(stderr);
        }

        console.log(stdout);
        return resolve();
      }
    );
  });
}
