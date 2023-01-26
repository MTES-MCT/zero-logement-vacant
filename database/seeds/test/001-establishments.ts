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
import { v4 as uuidv4 } from 'uuid';
import { LocalityApi, TaxKindsApi } from '../../../server/models/LocalityApi';

export const Locality1: LocalityApi = genLocalityApi();
export const Locality2: LocalityApi = {
  ...genLocalityApi(),
  taxKind: TaxKindsApi.TLV,
};

export const Establishment1 = genEstablishmentApi(Locality1.geoCode);
export const Establishment2 = genEstablishmentApi(Locality2.geoCode);

exports.seed = function (knex: Knex) {
  return Promise.all([
    knex.table(localitiesTable).insert({
      id: uuidv4(),
      ...localityRepository.formatLocalityApi(Locality1),
    }),
    knex.table(localitiesTable).insert({
      id: uuidv4(),
      ...localityRepository.formatLocalityApi(Locality2),
    }),
    knex.table(establishmentsTable).insert({
      ...establishmentRepository.formatEstablishmentApi(Establishment1),
      available: true,
    }),
    knex.table(establishmentsTable).insert({
      ...establishmentRepository.formatEstablishmentApi(Establishment2),
      available: true,
    }),
  ]);
};
