import async from 'async';
import { Knex } from 'knex';
import { exec } from 'node:child_process';
import path from 'node:path';

import config from '~/infra/config';
import {
  Establishments,
  establishmentsTable,
} from '~/repositories/establishmentRepository';
import { Housing, housingTable } from '~/repositories/housingRepository';
import { Localities, localitiesTable } from '~/repositories/localityRepository';
import { Owners, ownerTable } from '~/repositories/ownerRepository';
import {
  EstablishmentLocalities,
  establishmentsLocalitiesTable,
} from '~/repositories/establishmentLocalityRepository';
import {
  HousingOwners,
  housingOwnersTable,
} from '~/repositories/housingOwnerRepository';
import { settingsTable } from '~/repositories/settingsRepository';

export async function seed(knex: Knex): Promise<void> {
  // Clean up
  await knex(housingOwnersTable).delete();
  await knex(housingTable).delete();
  if (await knex.schema.hasTable('_extract_zlv_')) {
    await knex.schema.dropTable('_extract_zlv_');
  }
  console.info('Removed houses.');
  await knex(ownerTable).delete();
  console.info('Removed owners.');

  await knex(settingsTable).delete();
  console.info('Removed settings.');
  await knex(establishmentsLocalitiesTable).delete();
  await knex(establishmentsTable).delete();
  console.info('Removed establishments.');
  await knex(localitiesTable).delete();
  console.info('Removed localities.');

  const files = [
    {
      script: path.join(
        'scripts',
        '001-load-establishments_com_epci_reg_dep.sql',
      ),
      data: path.join('data', 'common', 'com_epci_dep_reg.csv'),
    },
    {
      script: path.join(
        'scripts',
        '002-load-establishments_direction_territoriale.sql',
      ),
      data: path.join('data', 'common', 'direction_territoriale.csv'),
    },
    {
      script: path.join('scripts', '003-load-establishment_kinds.sql'),
      data: path.join('data', 'common', 'nature_juridique.csv'),
    },
    {
      script: path.join('scripts', '004-load-data.sql'),
      data: path.join('data', 'dummy', 'dummy_data.csv'),
    },
    {
      script: path.join('scripts', '006-load-locality-taxes.sql'),
      data: path.join('data', 'common', 'taxe.csv'),
    },
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
      { cwd: path.join(__dirname, '..', '..') },
      (error, stdout, stderr) => {
        if (error) {
          return reject(error ?? stderr);
        }

        if (stderr) {
          console.warn(stderr);
        }

        console.log(stdout);
        return resolve();
      },
    );
  });
}
