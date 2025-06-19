import { faker } from '@faker-js/faker/locale/fr';
import { OwnerRank } from '@zerologementvacant/models';
import {
  compareHousingOwners,
  equals,
  HOUSING_OWNER_EQUIVALENCE,
  HOUSING_OWNER_RANK_EQUIVALENCE,
  HousingOwnerApi,
  toHousingOwnersApi
} from '~/models/HousingOwnerApi';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';

describe('HousingOwnerApi', () => {
  describe('HOUSING_OWNER_EQUIVALENCE', () => {
    it('should return true if two housing owners refer to the same housing and owner', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const a = genHousingOwnerApi(housing, owner);
      const b = { ...a };

      const actual = HOUSING_OWNER_EQUIVALENCE(a, b);

      expect(actual).toBeTrue();
    });

    it('should return false otherwise', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const a = genHousingOwnerApi(housing, owner);
      const b = {
        ...a,
        ownerId: faker.string.uuid()
      };

      const actual = HOUSING_OWNER_EQUIVALENCE(a, b);

      expect(actual).toBeFalse();
    });
  });

  describe('HOUSING_OWNER_RANK_EQUIVALENCE', () => {
    it('should return true if two housing owners refer to the same housing, owner and rank', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const a: HousingOwnerApi = genHousingOwnerApi(housing, owner);
      const b: HousingOwnerApi = { ...a };

      const actual = HOUSING_OWNER_RANK_EQUIVALENCE(a, b);

      expect(actual).toBeTrue();
    });

    it('should return false otherwise', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();
      const a: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        rank: 1
      };
      const b: HousingOwnerApi = {
        ...a,
        rank: 2
      };

      const actual = HOUSING_OWNER_RANK_EQUIVALENCE(a, b);

      expect(actual).toBeFalse();
    });
  });

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
