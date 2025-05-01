import { faker } from '@faker-js/faker/locale/fr';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';

import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genGeoPerimeterApi,
  genUserApi
} from '~/test/testFixtures';
import perimeterRepository, {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '../geoRepository';

describe('Perimeter repository', () => {
  describe('find', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const perimeters = faker.helpers.multiple(() =>
      genGeoPerimeterApi(establishment.id, user)
    );

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
      await GeoPerimeters().insert(perimeters.map(formatGeoPerimeterApi));
    });

    it('should filter by establishment', async () => {
      const anotherEstablishment = genEstablishmentApi();
      const anotherUser = genUserApi(anotherEstablishment.id);
      const perimeters = faker.helpers.multiple(() =>
        genGeoPerimeterApi(anotherEstablishment.id, user)
      );
      await Establishments().insert(
        formatEstablishmentApi(anotherEstablishment)
      );
      await Users().insert(formatUserApi(anotherUser));
      await GeoPerimeters().insert(perimeters.map(formatGeoPerimeterApi));

      const actual = await perimeterRepository.find(anotherEstablishment.id);

      expect(actual).toHaveLength(perimeters.length);
      expect(actual).toSatisfyAll<GeoPerimeterApi>((perimeter) => {
        return perimeter.establishmentId === anotherEstablishment.id;
      });
    });
  });
});
