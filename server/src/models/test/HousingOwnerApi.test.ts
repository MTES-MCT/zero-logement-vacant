import { OwnerRank } from '@zerologementvacant/models';
import {
  compareHousingOwners,
  equals,
  HousingOwnerApi,
  toHousingOwnersApi
} from '~/models/HousingOwnerApi';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';

describe('HousingOwnerApi', () => {
  describe('toHousingOwnersApi', () => {
    it('should map a housing and its owners to housing owners', () => {
      const housing = genHousingApi();
      const owners = new Array(5).fill(0).map(genOwnerApi);

      const actual = toHousingOwnersApi(housing, owners);

      expect(actual).toBeArrayOfSize(owners.length);
      expect(actual).toBeSortedBy('rank');
    });
  });

  describe('compareHousingOwners', () => {
    it('should return properties that differ', () => {
      const a = genHousingOwnerApi(genHousingApi(), genOwnerApi());
      const b: HousingOwnerApi = {
        ...a,
        rank: (a.rank + 1) as OwnerRank
      };

      const actual = compareHousingOwners(a, b);

      expect(actual).toStrictEqual({
        rank: a.rank
      });
    });
  });

  describe('equals', () => {
    it('should return true if all properties are equal, false otherwise', () => {
      const a = genHousingOwnerApi(genHousingApi(), genOwnerApi());
      const b: HousingOwnerApi = {
        ...a,
        rank: (a.rank + 1) as OwnerRank
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
