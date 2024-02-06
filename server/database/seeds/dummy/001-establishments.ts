import { establishmentsTable } from '../../../repositories/establishmentRepository';
import { Knex } from 'knex';
import { establishmentsLocalitiesTable } from '../../../repositories/housingRepository';
import { localitiesTable } from '../../../repositories/localityRepository';

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
      .orderBy(`${establishmentsTable}.id`, `${localitiesTable}.geo_code`)
  );
};
