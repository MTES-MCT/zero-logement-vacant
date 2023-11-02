import { Owner1, Owner2 } from './004-owner';
import { genHousingApi } from '../../../server/test/testFixtures';
import {
  formatHousingRecordApi,
  housingTable,
  ReferenceDataYear,
} from '../../../server/repositories/housingRepository';
import { Locality1 } from './001-establishments';
import { Knex } from 'knex';
import { housingOwnersTable } from '../../../server/repositories/housingOwnerRepository';

export const Housing0 = genHousingApi(Locality1.geoCode);
export const Housing1 = genHousingApi(Locality1.geoCode);
export const Housing2 = genHousingApi(Locality1.geoCode);
export const HousingShortVacancy = {
  ...genHousingApi(Locality1.geoCode),
  vacancyStartYear: ReferenceDataYear - 1,
};

// @ts-ignore
exports.seed = function (knex: Knex) {
  return Promise.all([
    knex
      .table(housingTable)
      .insert([
        formatHousingRecordApi(Housing0),
        formatHousingRecordApi(Housing1),
        formatHousingRecordApi(Housing2),
        formatHousingRecordApi(HousingShortVacancy),
      ])
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
        ])
      ),
  ]);
};
