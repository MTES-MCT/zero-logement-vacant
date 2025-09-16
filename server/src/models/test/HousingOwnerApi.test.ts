import { faker } from '@faker-js/faker/locale/fr';
import {
  HOUSING_OWNER_EQUIVALENCE,
  HOUSING_OWNER_RANK_EQUIVALENCE,
  HousingOwnerApi,
  listAddedHousingOwners,
  listRemovedHousingOwners,
  listUpdatedHousingOwners,
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

  describe('listAddedHousingOwners', () => {
    it('should return housing owners that are in after but not in before', () => {
      const housing1 = genHousingApi();
      const housing2 = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();
      const owner3 = genOwnerApi();

      const before = [
        genHousingOwnerApi(housing1, owner1),
        genHousingOwnerApi(housing1, owner2)
      ];

      const after = [
        genHousingOwnerApi(housing1, owner1), // Same as before
        genHousingOwnerApi(housing1, owner2), // Same as before
        genHousingOwnerApi(housing1, owner3), // New owner
        genHousingOwnerApi(housing2, owner1) // New housing-owner combination
      ];

      const actual = listAddedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(2);
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing1.id,
          ownerId: owner3.id
        })
      );
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing2.id,
          ownerId: owner1.id
        })
      );
    });

    it('should return empty array when no housing owners were added', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();

      const before = [
        genHousingOwnerApi(housing, owner1),
        genHousingOwnerApi(housing, owner2)
      ];

      const after = [
        genHousingOwnerApi(housing, owner1),
        genHousingOwnerApi(housing, owner2)
      ];

      const actual = listAddedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return empty array when housing owners were only removed', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();

      const before = [
        genHousingOwnerApi(housing, owner1),
        genHousingOwnerApi(housing, owner2)
      ];

      const after = [genHousingOwnerApi(housing, owner1)];

      const actual = listAddedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return all housing owners when before is empty', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();

      const before: HousingOwnerApi[] = [];

      const after = [
        genHousingOwnerApi(housing, owner1),
        genHousingOwnerApi(housing, owner2)
      ];

      const actual = listAddedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(2);
      expect(actual).toEqual(after);
    });

    it('should return empty array when after is empty', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();

      const before = [genHousingOwnerApi(housing, owner1)];
      const after: HousingOwnerApi[] = [];

      const actual = listAddedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return empty array when both before and after are empty', () => {
      const before: HousingOwnerApi[] = [];
      const after: HousingOwnerApi[] = [];

      const actual = listAddedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should consider housing owners with different ranks as equivalent for addition detection', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();

      const before = [
        { ...genHousingOwnerApi(housing, owner), rank: 1 } as HousingOwnerApi
      ];

      const after = [
        { ...genHousingOwnerApi(housing, owner), rank: 2 } as HousingOwnerApi
      ];

      const actual = listAddedHousingOwners(before, after);

      // Should be empty because HOUSING_OWNER_EQUIVALENCE ignores rank
      expect(actual).toBeArrayOfSize(0);
    });
  });

  describe('listRemovedHousingOwners', () => {
    it('should return housing owners that are in before but not in after', () => {
      const housing1 = genHousingApi();
      const housing2 = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();
      const owner3 = genOwnerApi();

      const before = [
        genHousingOwnerApi(housing1, owner1),
        genHousingOwnerApi(housing1, owner2),
        genHousingOwnerApi(housing1, owner3), // Will be removed
        genHousingOwnerApi(housing2, owner1) // Will be removed
      ];

      const after = [
        genHousingOwnerApi(housing1, owner1), // Same as before
        genHousingOwnerApi(housing1, owner2) // Same as before
      ];

      const actual = listRemovedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(2);
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing1.id,
          ownerId: owner3.id
        })
      );
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing2.id,
          ownerId: owner1.id
        })
      );
    });

    it('should return empty array when no housing owners were removed', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();

      const before = [
        genHousingOwnerApi(housing, owner1),
        genHousingOwnerApi(housing, owner2)
      ];

      const after = [
        genHousingOwnerApi(housing, owner1),
        genHousingOwnerApi(housing, owner2)
      ];

      const actual = listRemovedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return empty array when housing owners were only added', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();

      const before = [genHousingOwnerApi(housing, owner1)];

      const after = [
        genHousingOwnerApi(housing, owner1),
        genHousingOwnerApi(housing, owner2)
      ];

      const actual = listRemovedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return all housing owners when after is empty', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();

      const before = [
        genHousingOwnerApi(housing, owner1),
        genHousingOwnerApi(housing, owner2)
      ];

      const after: HousingOwnerApi[] = [];

      const actual = listRemovedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(2);
      expect(actual).toEqual(before);
    });

    it('should return empty array when before is empty', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();

      const before: HousingOwnerApi[] = [];
      const after = [genHousingOwnerApi(housing, owner1)];

      const actual = listRemovedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return empty array when both before and after are empty', () => {
      const before: HousingOwnerApi[] = [];
      const after: HousingOwnerApi[] = [];

      const actual = listRemovedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should consider housing owners with different ranks as equivalent for removal detection', () => {
      const housing = genHousingApi();
      const owner = genOwnerApi();

      const before = [
        { ...genHousingOwnerApi(housing, owner), rank: 1 } as HousingOwnerApi
      ];

      const after = [
        { ...genHousingOwnerApi(housing, owner), rank: 2 } as HousingOwnerApi
      ];

      const actual = listRemovedHousingOwners(before, after);

      // Should be empty because HOUSING_OWNER_EQUIVALENCE ignores rank
      expect(actual).toBeArrayOfSize(0);
    });
  });

  describe('listUpdatedHousingOwners', () => {
    it('should return housing owners that have changed rank', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();
      const owner3 = genOwnerApi();

      const before = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing, owner2), rank: 2 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing, owner3), rank: 3 } as HousingOwnerApi
      ];

      const after = [
        { ...genHousingOwnerApi(housing, owner1), rank: 2 } as HousingOwnerApi, // Rank changed from 1 to 2
        { ...genHousingOwnerApi(housing, owner2), rank: 2 } as HousingOwnerApi, // Same rank (should not be included)
        { ...genHousingOwnerApi(housing, owner3), rank: 1 } as HousingOwnerApi // Rank changed from 3 to 1
      ];

      const actual = listUpdatedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(2);
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing.id,
          ownerId: owner1.id,
          rank: 1 // From before array
        })
      );
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing.id,
          ownerId: owner3.id,
          rank: 3 // From before array
        })
      );
    });

    it('should return empty array when no housing owners have changed rank', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();

      const before = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing, owner2), rank: 2 } as HousingOwnerApi
      ];

      const after = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing, owner2), rank: 2 } as HousingOwnerApi
      ];

      const actual = listUpdatedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return empty array when housing owners were only added or removed', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();
      const owner3 = genOwnerApi();

      const before = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing, owner2), rank: 2 } as HousingOwnerApi
      ];

      const after = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi, // Same
        { ...genHousingOwnerApi(housing, owner3), rank: 2 } as HousingOwnerApi // New owner, owner2 removed
      ];

      const actual = listUpdatedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should only consider housing owners that exist in both arrays', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();
      const owner3 = genOwnerApi();
      const owner4 = genOwnerApi();

      const before = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing, owner2), rank: 2 } as HousingOwnerApi, // Will be removed
        { ...genHousingOwnerApi(housing, owner3), rank: 3 } as HousingOwnerApi // Rank will change
      ];

      const after = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi, // Same rank
        { ...genHousingOwnerApi(housing, owner3), rank: 1 } as HousingOwnerApi, // Rank changed from 3 to 1
        { ...genHousingOwnerApi(housing, owner4), rank: 2 } as HousingOwnerApi // New owner
      ];

      const actual = listUpdatedHousingOwners(before, after);

      // Only owner3 should be returned because it exists in both arrays but with different rank
      expect(actual).toBeArrayOfSize(1);
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing.id,
          ownerId: owner3.id,
          rank: 3 // From before array
        })
      );
    });

    it('should return empty array when before is empty', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();

      const before: HousingOwnerApi[] = [];
      const after = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi
      ];

      const actual = listUpdatedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return empty array when after is empty', () => {
      const housing = genHousingApi();
      const owner1 = genOwnerApi();

      const before = [
        { ...genHousingOwnerApi(housing, owner1), rank: 1 } as HousingOwnerApi
      ];
      const after: HousingOwnerApi[] = [];

      const actual = listUpdatedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should return empty array when both before and after are empty', () => {
      const before: HousingOwnerApi[] = [];
      const after: HousingOwnerApi[] = [];

      const actual = listUpdatedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(0);
    });

    it('should handle multiple housing owners with rank changes correctly', () => {
      const housing1 = genHousingApi();
      const housing2 = genHousingApi();
      const owner1 = genOwnerApi();
      const owner2 = genOwnerApi();
      const owner3 = genOwnerApi();

      const before = [
        { ...genHousingOwnerApi(housing1, owner1), rank: 1 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing1, owner2), rank: 2 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing2, owner1), rank: 1 } as HousingOwnerApi,
        { ...genHousingOwnerApi(housing2, owner3), rank: 2 } as HousingOwnerApi
      ];

      const after = [
        { ...genHousingOwnerApi(housing1, owner1), rank: 2 } as HousingOwnerApi, // Rank changed
        { ...genHousingOwnerApi(housing1, owner2), rank: 2 } as HousingOwnerApi, // Same rank
        { ...genHousingOwnerApi(housing2, owner1), rank: 1 } as HousingOwnerApi, // Same rank
        { ...genHousingOwnerApi(housing2, owner3), rank: 1 } as HousingOwnerApi // Rank changed
      ];

      const actual = listUpdatedHousingOwners(before, after);

      expect(actual).toBeArrayOfSize(2);
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing1.id,
          ownerId: owner1.id,
          rank: 1 // Original rank from before
        })
      );
      expect(actual).toContainEqual(
        expect.objectContaining({
          housingId: housing2.id,
          ownerId: owner3.id,
          rank: 2 // Original rank from before
        })
      );
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
