import { Knex } from 'knex';

import {
  formatOwnerProspectApi,
  ownerProspectsTable,
} from '~/repositories/ownerProspectRepository';
import { genOwnerProspectApi } from '~/test/testFixtures';
import { Locality1, Locality2 } from './20240405011849_establishments';

export const OwnerProspect1 = genOwnerProspectApi(Locality1.geoCode);
export const OwnerProspect2 = genOwnerProspectApi(Locality2.geoCode);

export async function seed(knex: Knex): Promise<void> {
  await knex
    .table(ownerProspectsTable)
    .insert([OwnerProspect1, OwnerProspect2].map(formatOwnerProspectApi));
}
