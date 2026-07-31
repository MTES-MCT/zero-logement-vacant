import { faker } from '@faker-js/faker/locale/fr';

import { kysely } from '~/infra/database/kysely';
import { HousingApi } from '~/models/HousingApi';
import { PrecisionApi } from '~/models/PrecisionApi';
import precisionRepository, {
  toHousingPrecisionInsert
} from '~/repositories/precisionRepository';
import { factories } from '~/test/factories';

describe('Precision repository', () => {
  describe('link', () => {
    let housing: HousingApi;

    beforeEach(async () => {
      housing = await factories.housing.create();
    });

    it('should link a housing to precisions', async () => {
      const referential = (await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute()) as PrecisionApi[];
      const precisions = faker.helpers.arrayElements(referential, 3);

      await precisionRepository.link(housing, precisions);

      const actual = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
      expect(actual).toIncludeAllPartialMembers(
        precisions.map((precision) => ({
          housingGeoCode: housing.geoCode,
          housingId: housing.id,
          precisionId: precision.id
        }))
      );
    });

    it('should override precisions', async () => {
      const referential = (await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute()) as PrecisionApi[];
      const precisionsBefore = faker.helpers.arrayElements(referential, 3);
      const precisionsAfter = faker.helpers.arrayElements(referential, 2);
      await kysely
        .insertInto('housingPrecisions')
        .values(precisionsBefore.map(toHousingPrecisionInsert(housing)))
        .execute();

      await precisionRepository.link(housing, precisionsAfter);

      const actual = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
      expect(actual).toIncludeAllPartialMembers(
        precisionsAfter.map((precision) => ({
          housingGeoCode: housing.geoCode,
          housingId: housing.id,
          precisionId: precision.id
        }))
      );
    });

    it('should remove the housing precisions if given an empty array', async () => {
      const referential = (await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute()) as PrecisionApi[];
      const precisionsBefore = faker.helpers.arrayElements(referential, 3);
      await kysely
        .insertInto('housingPrecisions')
        .values(precisionsBefore.map(toHousingPrecisionInsert(housing)))
        .execute();

      await precisionRepository.link(housing, []);

      const actual = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
      expect(actual).toHaveLength(0);
    });
  });

  describe('linkMany', () => {
    let housings: HousingApi[];

    beforeEach(async () => {
      housings = await factories.housing.createList(2);
    });

    it('should link precisions to multiple housings', async () => {
      const referential = (await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute()) as PrecisionApi[];
      const precisions = faker.helpers.arrayElements(referential, 2);
      const links = housings.map((housing) => ({ housing, precisions }));

      await precisionRepository.linkMany(links);

      const actual = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where(
          'housingId',
          'in',
          housings.map((housing) => housing.id)
        )
        .execute();
      expect(actual).toHaveLength(4); // 2 housings × 2 precisions
      expect(actual).toIncludeAllPartialMembers([
        {
          housingId: housings[0].id,
          precisionId: precisions[0].id
        },
        {
          housingId: housings[0].id,
          precisionId: precisions[1].id
        },
        {
          housingId: housings[1].id,
          precisionId: precisions[0].id
        },
        {
          housingId: housings[1].id,
          precisionId: precisions[1].id
        }
      ]);
    });

    it('should replace existing precision links', async () => {
      const referential = (await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute()) as PrecisionApi[];
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

      const actual = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where(
          'housingId',
          'in',
          housings.map((housing) => housing.id)
        )
        .execute();
      expect(actual).toHaveLength(4); // 2 housings × 2 new precisions
      expect(actual).toIncludeAllPartialMembers(
        precisionsAfter.flatMap((precision) =>
          housings.map((housing) => ({
            housingId: housing.id,
            precisionId: precision.id
          }))
        )
      );
    });

    it('should handle empty housings array', async () => {
      // Should not throw an error
      await expect(precisionRepository.linkMany([])).resolves.not.toThrow();
    });

    it('should handle empty precisions array and remove existing links', async () => {
      const referential = (await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute()) as PrecisionApi[];
      const precisions = faker.helpers.arrayElements(referential, 2);
      const housing = faker.helpers.arrayElement(housings);
      // First add some precisions
      await kysely
        .insertInto('housingPrecisions')
        .values(precisions.map(toHousingPrecisionInsert(housing)))
        .execute();

      // Then call with empty array (should remove all)
      await precisionRepository.linkMany([
        {
          housing: housing,
          precisions: []
        }
      ]);

      const actual = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where((eb) =>
          eb(
            eb.refTuple('housingGeoCode', 'housingId'),
            'in',
            housings.map((housing) => eb.tuple(housing.geoCode, housing.id))
          )
        )
        .execute();
      expect(actual).toHaveLength(0);
    });

    it('should not touch precision links of a housing absent from the batch', async () => {
      const untouched = await factories.housing.create();
      const referential = (await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute()) as PrecisionApi[];
      const [precisionA, precisionB] = faker.helpers.arrayElements(
        referential,
        2
      );
      await kysely
        .insertInto('housingPrecisions')
        .values(toHousingPrecisionInsert(untouched)(precisionA))
        .execute();

      await precisionRepository.linkMany([
        { housing: housings[0], precisions: [precisionB] }
      ]);

      const actual = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', untouched.geoCode)
        .where('housingId', '=', untouched.id)
        .execute();
      expect(actual).toHaveLength(1);
      expect(actual[0].precisionId).toBe(precisionA.id);
    });
  });
});
