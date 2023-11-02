import { Knex } from 'knex';
import { genSettingsApi } from '../../../server/test/testFixtures';
import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import {
  formatSettingsApi,
  settingsTable,
} from '../../../server/repositories/settingsRepository';

exports.seed = async (knex: Knex) => {
  const establishmentIds = await knex.table(establishmentsTable).select('id');
  if (establishmentIds.length) {
    return knex
      .table(settingsTable)
      .insert(
        establishmentIds.map((result) =>
          formatSettingsApi({
            ...genSettingsApi(result),
            contactPoints: { public: true },
          })
        )
      )
      .onConflict()
      .ignore();
  }
};
