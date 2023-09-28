import { Owner1, Owner2 } from './004-owner';
import { genHousingApi } from '../../../server/test/testFixtures';
import housingRepository, {
  housingTable,
  ownersHousingTable,
  ReferenceDataYear,
} from '../../../server/repositories/housingRepository';
import { Locality1 } from './001-establishments';
import { Knex } from 'knex';

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
        housingRepository.formatHousingRecordApi(Housing0),
        housingRepository.formatHousingRecordApi(Housing1),
        housingRepository.formatHousingRecordApi(Housing2),
        housingRepository.formatHousingRecordApi(HousingShortVacancy),
      ])
      .then(() =>
        knex.table(ownersHousingTable).insert([
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
