import { Knex } from 'knex';
import ownerProspectRepository, {
  ownerProspectsTable,
} from '../../../server/repositories/ownerProspectRepository';
import { genOwnerProspectApi } from '../../../server/test/testFixtures';
import { Locality1, Locality2 } from './001-establishments';

export const OwnerProspect1 = genOwnerProspectApi(Locality1.geoCode);
export const OwnerProspect2 = genOwnerProspectApi(Locality2.geoCode);

exports.seed = function (knex: Knex) {
  return knex
    .table(ownerProspectsTable)
    .insert([
      ownerProspectRepository.formatOwnerProspectApi(OwnerProspect1),
      ownerProspectRepository.formatOwnerProspectApi(OwnerProspect2),
    ]);
};
