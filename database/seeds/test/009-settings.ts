import { Establishment1 } from './001-establishments';
import { Knex } from 'knex';
import {
  formatSettingsApi,
  settingsTable,
} from '../../../server/repositories/settingsRepository';
import { genSettingsApi } from '../../../server/test/testFixtures';

export const Settings1 = {
  ...genSettingsApi(Establishment1.id),
  contactPoints: { public: true },
};

exports.seed = function (knex: Knex) {
  return Promise.all([
    knex.table(settingsTable).insert(formatSettingsApi(Settings1)),
  ]);
};
