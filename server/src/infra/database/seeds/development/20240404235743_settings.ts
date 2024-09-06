import { Knex } from 'knex';

import { genSettingsApi } from '~/test/testFixtures';
import { Establishments } from '~/repositories/establishmentRepository';
import {
  formatSettingsApi,
  settingsTable
} from '~/repositories/settingsRepository';

export async function seed(knex: Knex): Promise<void> {
  const establishments = await Establishments(knex).select('id');

  const settings = establishments.map((establishment) =>
    formatSettingsApi({
      ...genSettingsApi(establishment.id),
      contactPoints: {
        public: true
      }
    })
  );

  await knex.batchInsert(settingsTable, settings);
}
