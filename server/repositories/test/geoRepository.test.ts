import { faker } from '@faker-js/faker/locale/fr';

import geoRepository, {
  formatGeoPerimeterApi,
  GeoPerimeters,
} from '../geoRepository';
import {
  genEstablishmentApi,
  genGeoPerimeterApi,
} from '../../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi,
} from '../establishmentRepository';
import { GeoPerimeterApi } from '../../models/GeoPerimeterApi';

describe('Geo perimeter repository', () => {
  const establishment = genEstablishmentApi();

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
  });

  describe('find', () => {
    const perimeters = Array.from({ length: 3 }, () =>
      genGeoPerimeterApi(establishment.id)
    );

    beforeAll(async () => {
      await GeoPerimeters().insert(perimeters.map(formatGeoPerimeterApi));
    });

    it('should return all perimeters', async () => {
      const actual = await geoRepository.find();

      expect(actual).toIncludeAllMembers<GeoPerimeterApi>(perimeters);
    });

    it('should return an establishment’s perimeters', async () => {
      const actual = await geoRepository.find({
        filters: {
          establishmentId: establishment.id,
        },
      });

      expect(actual).toIncludeAllMembers<GeoPerimeterApi>(perimeters);
    });
  });

  describe('get', () => {
    it('should return null if the perimeter is missing', async () => {
      const actual = await geoRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });

    it('should return the perimeter if it exists', async () => {
      const perimeter = genGeoPerimeterApi(establishment.id);
      await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));

      const actual = await geoRepository.get(perimeter.id);

      expect(actual).toStrictEqual<GeoPerimeterApi>(perimeter);
    });
  });
});
