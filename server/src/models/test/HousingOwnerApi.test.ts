import { faker } from '@faker-js/faker/locale/fr';
import { DO_NOT_CONTACT_OWNER_RANK } from '@zerologementvacant/models';
import {
  HOUSING_OWNER_EQUIVALENCE,
  HOUSING_OWNER_RANK_EQUIVALENCE,
  HousingOwnerApi,
  markOwnerDoNotContact,
  toHousingOwnersApi,
  unmarkOwnerDoNotContact
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

  describe('markOwnerDoNotContact', () => {
    const housing = genHousingApi();

    it('should promote the next owner to primary when the primary is marked', () => {
      const a: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 1 };
      const b: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 2 };
      const c: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 3 };

      const actual = markOwnerDoNotContact([a, b, c], a.ownerId);

      expect(actual).toEqual([
        { ...b, rank: 1 },
        { ...c, rank: 2 },
        { ...a, rank: DO_NOT_CONTACT_OWNER_RANK }
      ]);
    });

    it('should re-rank remaining active owners when a secondary is marked', () => {
      const a: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 1 };
      const b: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 2 };
      const c: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 3 };

      const actual = markOwnerDoNotContact([a, b, c], b.ownerId);

      expect(actual).toEqual([
        { ...a, rank: 1 },
        { ...c, rank: 2 },
        { ...b, rank: DO_NOT_CONTACT_OWNER_RANK }
      ]);
    });

    it('should keep inactive owners untouched', () => {
      const a: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 1 };
      const b: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 2 };
      const previous: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 0 };

      const actual = markOwnerDoNotContact([a, b, previous], a.ownerId);

      expect(actual).toEqual([
        { ...b, rank: 1 },
        { ...a, rank: DO_NOT_CONTACT_OWNER_RANK },
        previous
      ]);
    });
  });

  describe('unmarkOwnerDoNotContact', () => {
    const housing = genHousingApi();

    it('should rejoin as the next secondary owner', () => {
      const a: HousingOwnerApi = { ...genHousingOwnerApi(housing, genOwnerApi()), rank: 1 };
      const b: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, genOwnerApi()),
        rank: DO_NOT_CONTACT_OWNER_RANK
      };

      const actual = unmarkOwnerDoNotContact([a, b], b.ownerId);

      expect(actual).toEqual([
        { ...a, rank: 1 },
        { ...b, rank: 2 }
      ]);
    });

    it('should become primary when it is the only owner', () => {
      const b: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, genOwnerApi()),
        rank: DO_NOT_CONTACT_OWNER_RANK
      };

      const actual = unmarkOwnerDoNotContact([b], b.ownerId);

      expect(actual).toEqual([{ ...b, rank: 1 }]);
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
});
