import { Knex } from 'knex';

import { formatOwnerApi, ownerTable } from '~/repositories/ownerRepository';
import { genOwnerApi } from '~/test/testFixtures';

export const Owner1 = genOwnerApi();
export const Owner2 = genOwnerApi();

export async function seed(knex: Knex): Promise<void> {
  const owners = [Owner1, Owner2].map(formatOwnerApi);
  await knex.table(ownerTable).insert(owners);
}
