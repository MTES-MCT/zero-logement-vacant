import { faker } from '@faker-js/faker/locale/fr';

import precisionRepository, {
  HousingPrecisionDBO,
  HousingPrecisions,
  Precisions
} from '~/repositories/precisionRepository';
import { genHousingApi } from '~/test/testFixtures';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';

describe('Precision repository', () => {
  describe('link', () => {
    const housing = genHousingApi();

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
    });

    it('should link a housing to precisions', async () => {
      const referential = await Precisions();
      const precisions = faker.helpers.arrayElements(referential, 3);

      await precisionRepository.link(housing, precisions);

      const actual = await HousingPrecisions().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actual).toIncludeSameMembers(
        precisions.map<HousingPrecisionDBO>((precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id
        }))
      );
    });

    it('should override precisions', async () => {
      const referential = await Precisions();
      const precisionsBefore = faker.helpers.arrayElements(referential, 3);
      const precisionsAfter = faker.helpers.arrayElements(referential, 2);
      const housingPrecisions = precisionsBefore.map<HousingPrecisionDBO>(
        (precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id
        })
      );
      await HousingPrecisions().insert(housingPrecisions);

      await precisionRepository.link(housing, precisionsAfter);

      const actual = await HousingPrecisions().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actual).toIncludeSameMembers(
        precisionsAfter.map<HousingPrecisionDBO>((precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id
        }))
      );
    });

    it('should remove the housing precisions if given an empty array', async () => {
      const referential = await Precisions();
      const precisionsBefore = faker.helpers.arrayElements(referential, 3);
      const housingPrecisions = precisionsBefore.map<HousingPrecisionDBO>(
        (precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id
        })
      );
      await HousingPrecisions().insert(housingPrecisions);

      await precisionRepository.link(housing, []);

      const actual = await HousingPrecisions().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actual).toHaveLength(0);
    });
  });
});
