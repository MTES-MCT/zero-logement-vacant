import { faker } from '@faker-js/faker/locale/fr';
import {
  genDatafoncierOwners
} from '@zerologementvacant/models/fixtures';
import type { Knex } from 'knex';

import { DatafoncierHouses } from '~/repositories/datafoncierHousingRepository';


const TABLE = 'df_owners_nat_2024';

export async function seed(knex: Knex): Promise<void> {
  await knex(TABLE).truncate();

  const datafoncierHousings = await DatafoncierHouses();
  const datafoncierOwners = datafoncierHousings.flatMap(
    (datafoncierHousing) => {
      const count = faker.number.int({ min: 1, max: 6 });
      return genDatafoncierOwners(datafoncierHousing.idprocpte, count);
    }
  );

  console.log(`Inserting ${datafoncierOwners.length} datafoncier owners...`);
  await knex.batchInsert(TABLE, datafoncierOwners);
}
