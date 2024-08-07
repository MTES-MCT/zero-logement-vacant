import { Knex } from 'knex';

import { LocalityApi, TaxKindsApi } from '~/models/LocalityApi';
import establishmentRepository, {
  establishmentsTable
} from '~/repositories/establishmentRepository';
import { establishmentsLocalitiesTable } from '~/repositories/establishmentLocalityRepository';
import localityRepository, {
  localitiesTable
} from '~/repositories/localityRepository';
import { genEstablishmentApi, genLocalityApi } from '~/test/testFixtures';

export const Locality1: LocalityApi = genLocalityApi();
export const Locality2: LocalityApi = {
  ...genLocalityApi(),
  taxKind: TaxKindsApi.TLV
};

/**
 * Cannot remove this yet because it is used by {@link server/src/services/ceremaService/consultUserService.ts}
 */
export const Establishment1 = genEstablishmentApi(Locality1.geoCode);
export const Establishment2 = genEstablishmentApi(Locality2.geoCode);

export async function seed(knex: Knex): Promise<void> {
  await Promise.all([
    knex
      .table(localitiesTable)
      .insert(localityRepository.formatLocalityApi(Locality1)),
    knex
      .table(localitiesTable)
      .insert(localityRepository.formatLocalityApi(Locality2)),
    knex.table(establishmentsTable).insert({
      ...establishmentRepository.formatEstablishmentApi(Establishment1),
      available: true
    }),
    knex.table(establishmentsTable).insert({
      ...establishmentRepository.formatEstablishmentApi(Establishment2),
      available: true
    })
  ]);
  const establishmentLocalities = [
    {
      establishment_id: Establishment1.id,
      locality_id: Locality1.id
    },
    {
      establishment_id: Establishment2.id,
      locality_id: Locality2.id
    }
  ];
  await knex
    .table(establishmentsLocalitiesTable)
    .insert(establishmentLocalities);
}
