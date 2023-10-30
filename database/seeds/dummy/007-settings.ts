import { Knex } from 'knex';
import { genSettingsApi } from '../../../server/test/testFixtures';
import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import { settingsTable } from '../../../server/repositories/settingsRepository';

exports.seed = async (knex: Knex) => {
  const results = await knex.table(establishmentsTable).select('id');
  if (results.length) {
    return knex
      .table(settingsTable)
      .insert(
        results.map((result) => ({
          ...genSettingsApi(result),
          contactPoints: { public: true },
        }))
      )
      .onConflict()
      .ignore();
  }
};
