import async from 'async';
import { Knex } from 'knex';
import fp from 'lodash/fp';

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

  const chunks = fp.chunk(1000, settings);
  await async.forEachSeries(chunks, async (chunk) => {
    await knex(settingsTable).insert(chunk).onConflict().ignore();
  });
}
