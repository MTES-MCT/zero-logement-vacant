import { Establishment1, Establishment2 } from './001-establishments';
import { genContactPointApi } from '../../../server/test/testFixtures';
import { Knex } from 'knex';
import {
  contactPointsTable,
  formatContactPointApi,
} from '../../../server/repositories/contactPointsRepository';

export const ContactPoint1 = genContactPointApi(Establishment1.id);
export const ContactPoint2 = genContactPointApi(Establishment2.id);

exports.seed = function (knex: Knex) {
  return Promise.all([
    knex.table(contactPointsTable).insert(formatContactPointApi(ContactPoint1)),
    knex.table(contactPointsTable).insert(formatContactPointApi(ContactPoint2)),
  ]);
};
