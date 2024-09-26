import {
  compareHousingOwners,
  equals,
  HousingOwnerApi,
  toHousingOwnersApi,
} from '~/models/HousingOwnerApi';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
} from '~/test/testFixtures';

describe('HousingOwnerApi', () => {
  describe('toHousingOwnersApi', () => {
    it('should map a housing and its owners to housing owners', async () => {
      const housing = await genHousingApi();
      const geoCode = '67268';
      const owners = await Promise.all(new Array(5).fill(0).map(async () => await genOwnerApi(geoCode)));

      const actual = toHousingOwnersApi(housing, owners);

      expect(actual).toBeArrayOfSize(owners.length);
      expect(actual).toBeSortedBy('rank');
    });
  });

  describe('compareHousingOwners', () => {
    it('should return properties that differ', async () => {
      const housingApi = await genHousingApi();
      const geoCode = '67268';
      const a = genHousingOwnerApi(housingApi, await genOwnerApi(geoCode));
      const b: HousingOwnerApi = {
        ...a,
        rank: a.rank + 1,
      };

      const actual = compareHousingOwners(a, b);

      expect(actual).toStrictEqual({
        rank: a.rank,
      });
    });
  });

  describe('equals', () => {
    it('should return true if all properties are equal, false otherwise', async () => {
      const housingApi = await genHousingApi();
      const geoCode = '67268';
      const a = genHousingOwnerApi(housingApi, await genOwnerApi(geoCode));
      const b: HousingOwnerApi = {
        ...a,
        rank: a.rank + 1,
      };

      const actual = equals(a, b);

      expect(actual).toBeFalse();
    });

    it('should return true if both values are undefined', () => {
      const a = undefined;
      const b = undefined;

      const actual = equals(a, b);

      expect(actual).toBeTrue();
    });
  });
});
