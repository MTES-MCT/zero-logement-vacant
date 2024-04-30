import async from 'async';
import { Knex } from 'knex';
import fp from 'lodash/fp';
import { genSettingsApi } from '../../../server/test/testFixtures';
import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import {
  formatSettingsApi,
  settingsTable,
} from '../../../server/repositories/settingsRepository';

exports.seed = async (knex: Knex) => {
  const establishmentIds = await knex.table(establishmentsTable).select('id');
  if (establishmentIds.length) {
    const settings = establishmentIds.map(({ id }) =>
      formatSettingsApi({
        ...genSettingsApi(id),
        contactPoints: { public: true },
      })
    );
    await async.forEach(fp.chunk(1000, settings), async (settings) => {
      await knex.table(settingsTable).insert(settings).onConflict().ignore();
    });
  }
};
