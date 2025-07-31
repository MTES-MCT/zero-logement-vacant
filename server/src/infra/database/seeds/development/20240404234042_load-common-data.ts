import async from 'async';
import { Knex } from 'knex';
import { exec } from 'node:child_process';
import path from 'node:path';

import config from '~/infra/config';
import { establishmentsTable } from '~/repositories/establishmentRepository';
import { localitiesTable } from '~/repositories/localityRepository';
import { NOTES_TABLE } from '~/repositories/noteRepository';
import { resetLinkTable } from '~/repositories/resetLinkRepository';
import { signupLinkTable } from '~/repositories/signupLinkRepository';

export async function seed(knex: Knex): Promise<void> {
  // Clean up
  const tables = [
    establishmentsTable,
    localitiesTable,
    NOTES_TABLE,
    signupLinkTable,
    resetLinkTable
  ];
  await async.forEachSeries(tables, async (table) => {
    await knex.raw(`TRUNCATE TABLE ${table} CASCADE`);
    console.log(`Truncated table ${table}.`);
  });

  const files = [
    {
      script: path.join(
        'scripts',
        '001-load-establishments_com_epci_reg_dep.sql'
      ),
      data: path.join('data', 'common', 'com_epci_dep_reg.csv')
    },
    {
      script: path.join(
        'scripts',
        '002-load-establishments_direction_territoriale.sql'
      ),
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
  await async.forEachSeries(files, async (file) => {
    await load(file.script, file.data);
  });
  console.log('Loaded common data.');
}

/**
 * Load a csv data file using the given script file.
 * @param script
 * @param data
 */
async function load(script: string, data: string): Promise<void> {
  const command = `psql ${config.db.url} -f ${script} -v filePath=${data} -v dateFormat="'MM/DD/YY/'" -v ON_ERROR_STOP=1`;
  console.info(`Executing ${command}`);
  await new Promise<void>((resolve, reject) => {
    exec(
      command,
      { cwd: path.join(import.meta.dirname, '..', '..') },
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
