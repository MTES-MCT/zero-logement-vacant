import { Knex } from 'knex';

import { genSettingsApi } from '~/test/testFixtures';
import { Establishments } from '~/repositories/establishmentRepository';
import {
  formatSettingsApi,
  settingsTable
} from '~/repositories/settingsRepository';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404235743_settings');
  const establishments = await Establishments(knex).select('id');

  const settings = establishments.map((establishment) =>
    formatSettingsApi(genSettingsApi(establishment.id))
  );

  console.log(`Inserting ${settings.length} settings...`);
  await knex.batchInsert(settingsTable, settings);
  console.timeEnd('20240404235743_settings');
  console.log('\n')
}
