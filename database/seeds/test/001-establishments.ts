import {
  genEstablishmentApi,
  genLocalityApi,
} from '../../../server/test/testFixtures';
import establishmentRepository, {
  establishmentsTable,
} from '../../../server/repositories/establishmentRepository';
import localityRepository, {
  localitiesTable,
} from '../../../server/repositories/localityRepository';
import { Knex } from 'knex';
import { LocalityApi, TaxKindsApi } from '../../../server/models/LocalityApi';
import { establishmentsLocalitiesTable } from '../../../server/repositories/housingRepository';

export const Locality1: LocalityApi = genLocalityApi();
export const Locality2: LocalityApi = {
  ...genLocalityApi(),
  taxKind: TaxKindsApi.TLV,
};

export const Establishment1 = genEstablishmentApi(Locality1.geoCode);
export const Establishment2 = genEstablishmentApi(Locality2.geoCode);

exports.seed = async function (knex: Knex) {
  await Promise.all([
    knex
      .table(localitiesTable)
      .insert(localityRepository.formatLocalityApi(Locality1)),
    knex
      .table(localitiesTable)
      .insert(localityRepository.formatLocalityApi(Locality2)),
    knex.table(establishmentsTable).insert({
      ...establishmentRepository.formatEstablishmentApi(Establishment1),
      available: true,
    }),
    knex.table(establishmentsTable).insert({
      ...establishmentRepository.formatEstablishmentApi(Establishment2),
      available: true,
    }),
  ]);
  const establishmentLocalities = [
    {
      establishment_id: Establishment1.id,
      locality_id: Locality1.id,
    },
    {
      establishment_id: Establishment2.id,
      locality_id: Locality2.id,
    },
  ];
  await knex
    .table(establishmentsLocalitiesTable)
    .insert(establishmentLocalities);
};
