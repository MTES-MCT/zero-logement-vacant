import { genOwnerApi } from '../../../server/test/testFixtures';
import {
  formatOwnerApi,
  ownerTable,
} from '../../../server/repositories/ownerRepository';
import { Knex } from 'knex';

export const Owner1 = genOwnerApi();
export const Owner2 = genOwnerApi();

// @ts-ignore
exports.seed = function (knex: Knex) {
  const owners = [Owner1, Owner2].map(formatOwnerApi);
  return knex.table(ownerTable).insert(owners);
};
