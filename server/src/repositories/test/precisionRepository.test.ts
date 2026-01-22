import { faker } from '@faker-js/faker/locale/fr';
import { HousingApi } from '~/models/HousingApi';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';

import precisionRepository, {
  HousingPrecisionDBO,
  HousingPrecisions,
  Precisions
} from '~/repositories/precisionRepository';
import { genHousingApi } from '~/test/testFixtures';

describe('Precision repository', () => {
  describe('link', () => {
    let housing: HousingApi;

    beforeEach(async () => {
      housing = genHousingApi();
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
      expect(actual).toIncludeAllPartialMembers(
        precisions.map((precision) => ({
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
      const housingPrecisions = precisionsBefore.map((precision) => ({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
        precision_id: precision.id
      }));
      await HousingPrecisions().insert(housingPrecisions);

      await precisionRepository.link(housing, precisionsAfter);

      const actual = await HousingPrecisions().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actual).toIncludeAllPartialMembers(
        precisionsAfter.map((precision) => ({
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
          precision_id: precision.id,
          created_at: new Date()
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

  describe('linkMany', () => {
    let housings: HousingApi[];

    beforeEach(async () => {
      housings = [genHousingApi(), genHousingApi()];
      await Housing().insert(housings.map(formatHousingRecordApi));
    });

    it('should link precisions to multiple housings', async () => {
      const referential = await Precisions();
      const precisions = faker.helpers.arrayElements(referential, 2);
      const links = housings.map((housing) => ({ housing, precisions }));

      await precisionRepository.linkMany(links);

      const actual = await HousingPrecisions().whereIn(
        'housing_id',
        housings.map((housing) => housing.id)
      );
      expect(actual).toHaveLength(4); // 2 housings × 2 precisions
      expect(actual).toIncludeAllPartialMembers([
        {
          housing_id: housings[0].id,
          precision_id: precisions[0].id
        },
        {
          housing_id: housings[0].id,
          precision_id: precisions[1].id
        },
        {
          housing_id: housings[1].id,
          precision_id: precisions[0].id
        },
        {
          housing_id: housings[1].id,
          precision_id: precisions[1].id
        }
      ]);
    });

    it('should replace existing precision links', async () => {
      const referential = await Precisions();
      const precisionsBefore = faker.helpers.arrayElements(referential, 3);
      const precisionsAfter = faker.helpers.arrayElements(referential, 2);
      const linksBefore = housings.map((housing) => ({
        housing,
        precisions: precisionsBefore
      }));
      const linksAfter = housings.map((housing) => ({
        housing,
        precisions: precisionsAfter
      }));

      // First link
      await precisionRepository.linkMany(linksBefore);

      // Second link with different precisions (should replace)
      await precisionRepository.linkMany(linksAfter);

      const actual = await HousingPrecisions().whereIn(
        'housing_id',
        housings.map((housing) => housing.id)
      );
      expect(actual).toHaveLength(4); // 2 housings × 2 new precisions
      expect(actual).toIncludeAllPartialMembers(
        precisionsAfter.flatMap((precision) =>
          housings.map((housing) => ({
            housing_id: housing.id,
            precision_id: precision.id
          }))
        )
      );
    });

    it('should handle empty housings array', async () => {
      // Should not throw an error
      await expect(precisionRepository.linkMany([])).resolves.not.toThrow();
    });

    it('should handle empty precisions array and remove existing links', async () => {
      const referential = await Precisions();
      const precisions = faker.helpers.arrayElements(referential, 2);
      const housing = faker.helpers.arrayElement(housings);
      // First add some precisions
      await HousingPrecisions().insert(
        precisions.map((precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id,
          created_at: new Date()
        }))
      );

      // Then call with empty array (should remove all)
      await precisionRepository.linkMany([
        {
          housing: housing,
          precisions: []
        }
      ]);

      const actual = await HousingPrecisions().whereIn(
        ['housing_geo_code', 'housing_id'],
        housings.map((housing) => [housing.geoCode, housing.id])
      );
      expect(actual).toHaveLength(0);
    });
  });
});
