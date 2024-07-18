import { Knex } from 'knex';

import { SirenStrasbourg } from './20240404235442_establishments';
import ownerProspectRepository, {
  ownerProspectsTable
} from '~/repositories/ownerProspectRepository';
import { establishmentsTable } from '~/repositories/establishmentRepository';
import { genOwnerProspectApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  const establishment = await knex
    .table(establishmentsTable)
    .where('siren', SirenStrasbourg)
    .first();

  const ownerProspects = [
    genOwnerProspectApi(establishment.localities_geo_code[0]),
    genOwnerProspectApi(establishment.localities_geo_code[1]),
    genOwnerProspectApi(establishment.localities_geo_code[2]),
    genOwnerProspectApi()
  ].map(ownerProspectRepository.formatOwnerProspectApi);

  await knex(ownerProspectsTable).insert(ownerProspects);
}
