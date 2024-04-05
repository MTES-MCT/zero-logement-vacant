import { Knex } from 'knex';

import { genSettingsApi } from '~/test/testFixtures';
import { establishmentsTable } from '~/repositories/establishmentRepository';
import {
  formatSettingsApi,
  settingsTable,
} from '~/repositories/settingsRepository';

export async function seed(knex: Knex): Promise<void> {
  const establishments = await knex(establishmentsTable).select('id');

  const settings = establishments.map((establishment) =>
    formatSettingsApi({
      ...genSettingsApi(establishment.id),
      contactPoints: {
        public: true,
      },
    }),
  );

  await knex(settingsTable).insert(settings).onConflict().ignore();
}
