import { Knex } from 'knex';

import {
  formatSettingsApi,
  settingsTable,
} from '~/repositories/settingsRepository';
import { genSettingsApi } from '~/test/testFixtures';
import { Establishment1 } from './20240405011849_establishments';

export const Settings1 = {
  ...genSettingsApi(Establishment1.id),
  contactPoints: { public: true },
};

export async function seed(knex: Knex): Promise<void> {
  await Promise.all([
    knex.table(settingsTable).insert(formatSettingsApi(Settings1)),
  ]);
}
