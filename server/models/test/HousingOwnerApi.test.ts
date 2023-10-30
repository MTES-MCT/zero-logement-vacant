import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
} from '../../test/testFixtures';
import {
  compareHousingOwners,
  equals,
  HousingOwnerApi,
  toHousingOwnersApi,
} from '../HousingOwnerApi';

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
      const a = genHousingOwnerApi();
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
    it('should return true if all properties are equal, false otherwise', () => {
      const a = genHousingOwnerApi();
      const b: HousingOwnerApi = {
        ...a,
        rank: a.rank + 1,
      };

      const actual = equals(a, b);

      expect(actual).toBeFalse();
    });
  });
});
