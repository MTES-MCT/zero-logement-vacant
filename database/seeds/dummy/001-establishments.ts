import { establishmentsTable } from '../../../server/repositories/establishmentRepository';
import { Knex } from 'knex';
import { establishmentsLocalitiesTable } from '../../../server/repositories/housingRepository';
import { localitiesTable } from '../../../server/repositories/localityRepository';

export const SirenStrasbourg = '246700488';
export const SirenSaintLo = '200066389';

exports.seed = async function (knex: Knex) {
  // Mise à disposition
  await knex
    .table(establishmentsTable)
    .update({ available: true })
    .whereIn('siren', [SirenStrasbourg, SirenSaintLo]);
  await knex.table(establishmentsLocalitiesTable).insert(
    knex
      .select(`${localitiesTable}.id`, `${establishmentsTable}.id`)
      .from(localitiesTable)
      .join(
        `${establishmentsTable}`,
        knex.raw(
          `${localitiesTable}.geo_code = ANY(${establishmentsTable}.localities_geo_code)`
        )
      )
  );
};
