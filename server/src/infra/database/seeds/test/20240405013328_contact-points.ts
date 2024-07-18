import { Knex } from 'knex';

import {
  contactPointsTable,
  formatContactPointApi
} from '~/repositories/contactPointsRepository';
import { genContactPointApi } from '~/test/testFixtures';
import {
  Establishment1,
  Establishment2
} from './20240405011849_establishments';

export const ContactPoint1 = genContactPointApi(Establishment1.id);
export const ContactPoint2 = genContactPointApi(Establishment2.id);

export async function seed(knex: Knex): Promise<void> {
  await knex
    .table(contactPointsTable)
    .insert([ContactPoint1, ContactPoint2].map(formatContactPointApi));
}
