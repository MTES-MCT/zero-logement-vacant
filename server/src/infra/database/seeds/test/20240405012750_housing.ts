import { Knex } from 'knex';

import { genHousingApi } from '~/test/testFixtures';
import {
  formatHousingRecordApi,
  housingTable,
  ReferenceDataFileYear,
} from '~/repositories/housingRepository';
import { housingOwnersTable } from '~/repositories/housingOwnerRepository';
import { Locality1 } from './20240405011849_establishments';
import { Owner1, Owner2 } from './20240405012710_owner';

export const Housing0 = genHousingApi(Locality1.geoCode);
export const Housing1 = genHousingApi(Locality1.geoCode);
export const Housing2 = genHousingApi(Locality1.geoCode);
export const HousingShortVacancy = {
  ...genHousingApi(Locality1.geoCode),
  vacancyStartYear: ReferenceDataFileYear - 1,
};

export async function seed(knex: Knex): Promise<void> {
  await Promise.all([
    knex
      .table(housingTable)
      .insert(
        [Housing0, Housing1, Housing2, HousingShortVacancy].map(
          formatHousingRecordApi,
        ),
      )
      .then(() =>
        knex.table(housingOwnersTable).insert([
          {
            owner_id: Owner1.id,
            housing_id: Housing0.id,
            housing_geo_code: Housing0.geoCode,
            rank: 1,
          },
          {
            owner_id: Owner2.id,
            housing_id: Housing0.id,
            housing_geo_code: Housing0.geoCode,
            rank: 2,
          },
          {
            owner_id: Owner1.id,
            housing_id: Housing1.id,
            housing_geo_code: Housing1.geoCode,
            rank: 1,
          },
          {
            owner_id: Owner1.id,
            housing_id: Housing2.id,
            housing_geo_code: Housing2.geoCode,
            rank: 1,
          },
          {
            owner_id: Owner1.id,
            housing_id: HousingShortVacancy.id,
            housing_geo_code: HousingShortVacancy.geoCode,
            rank: 1,
          },
        ]),
      ),
  ]);
}
