import { faker } from '@faker-js/faker/locale/fr';
import { Knex } from 'knex';
import { formatOwnerApi, ownerTable } from '~/repositories/ownerRepository';
import { Establishments } from '~/repositories/establishmentRepository';
import { genOwnerApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw(`TRUNCATE TABLE ${ownerTable} CASCADE`);

  const establishments = await Establishments(knex).where({ available: true });

  const owners = establishments.flatMap(() => {
    return faker.helpers.multiple(() => genOwnerApi(), {
      count: {
        min: 100,
        max: 5000
      }
    });
  });

  console.log(`Inserting ${owners.length} owners...`);
  await knex.batchInsert(ownerTable, owners.map(formatOwnerApi));
}
