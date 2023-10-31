import { Knex } from 'knex';
import { genSettingsApi } from '../../../server/test/testFixtures';
import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import { settingsTable } from '../../../server/repositories/settingsRepository';

exports.seed = function (knex: Knex) {
  return knex
    .table(establishmentsTable)
    .select('id')
    .then((results) => {
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
    });
};
