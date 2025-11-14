import { faker } from '@faker-js/faker/locale/fr';
import type { DatafoncierOwner } from '@zerologementvacant/models';
import { genDatafoncierOwner } from '@zerologementvacant/models/fixtures';
import type { Knex } from 'knex';

import { Establishments } from '~/repositories/establishmentRepository';

const TABLE = 'df_owners_nat_2024';

export async function seed(knex: Knex): Promise<void> {
  await knex(TABLE).truncate();

  const establishments = await Establishments(knex).where('available', true);
  const datafoncierOwners = establishments.flatMap<DatafoncierOwner>(
    (establishment) => {
      const geoCode = faker.helpers.arrayElement(
        establishment.localities_geo_code
      );
      return faker.helpers.multiple(() => genDatafoncierOwner(geoCode), {
        count: 10000
      });
    }
  );
  console.log(`Inserting ${datafoncierOwners.length} datafoncier owners...`);
  await knex.batchInsert(TABLE, datafoncierOwners);
}
