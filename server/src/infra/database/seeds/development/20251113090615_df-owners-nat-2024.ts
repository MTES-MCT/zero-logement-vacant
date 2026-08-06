import { faker } from '@faker-js/faker/locale/fr';
import type { DatafoncierHousing } from '@zerologementvacant/models';
import { genDatafoncierOwners } from '@zerologementvacant/models/fixtures';
import type { Knex } from 'knex';

import { datafoncierHousingTable } from '~/repositories/datafoncierHousingRepository';

const TABLE = 'df_owners_nat_2024';

export async function seed(knex: Knex): Promise<void> {
  console.time('20251113090615_df-owners-nat-2024');
  await knex(TABLE).truncate();

  const datafoncierHousings = await knex<DatafoncierHousing>(
    datafoncierHousingTable
  );
  const datafoncierOwners = datafoncierHousings.flatMap(
    (datafoncierHousing) => {
      const count = faker.number.int({ min: 1, max: 6 });
      return genDatafoncierOwners(datafoncierHousing.idprocpte, count);
    }
  );

  console.log(`Inserting ${datafoncierOwners.length} datafoncier owners...`);
  await knex.batchInsert(TABLE, datafoncierOwners);
  console.timeEnd('20251113090615_df-owners-nat-2024');
  console.log('\n');
}
