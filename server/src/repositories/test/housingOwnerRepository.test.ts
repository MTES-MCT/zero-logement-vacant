import { faker } from '@faker-js/faker/locale/fr';
import { PROPERTY_RIGHT_VALUES } from '@zerologementvacant/models';

import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import housingOwnerRepository, {
  formatHousingOwnerApi,
  fromRelativeLocationDBO,
  HousingOwnerDBO,
  HousingOwners,
  relativeLocationFilterToDBO,
  toRelativeLocationDBO
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import {
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi
} from '~/test/testFixtures';

describe('housingOwnerRepository', () => {
  describe('findByOwner', () => {
    it('should return a housing owner with their housings', async () => {
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
      const housings = faker.helpers.multiple(() => genHousingApi());
      await Housing().insert(housings.map(formatHousingRecordApi));
      const housingOwners: ReadonlyArray<HousingOwnerApi> = housings.map(
        (housing) => genHousingOwnerApi(housing, owner)
      );
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));

      const actuals = await housingOwnerRepository.findByOwner(owner);

      actuals.forEach((actual) => {
        const housingOwner = housingOwners.find(
          (housingOwner) =>
            housingOwner.ownerId === actual.ownerId &&
            housingOwner.housingGeoCode === actual.housingGeoCode &&
            housingOwner.housingId === actual.housingId
        );
        expect(actual).toMatchObject({
          id: housingOwner?.housingId,
          rank: housingOwner?.rank,
          propertyRight: housingOwner?.propertyRight
        });
      });
    });
  });

  describe('insert', () => {
    it('should ignore the conflict if the same owner is inserted twice at the same rank', async () => {
      const owner = genOwnerApi();
      const housing = genHousingApi();
      await Promise.all([
        Owners().insert(formatOwnerApi(owner)),
        Housing().insert(formatHousingRecordApi(housing))
      ]);
      const housingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        rank: -2,
        propertyRight: null
      };
      await HousingOwners().insert(formatHousingOwnerApi(housingOwner));

      await housingOwnerRepository.insert({
        ...genHousingOwnerApi(housing, owner),
        rank: -2,
        propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES)
      });
    });

    it('should ignore the conflict if the same owner is inserted at two different ranks', async () => {
      const owner = genOwnerApi();
      const housing = genHousingApi();
      await Promise.all([
        Owners().insert(formatOwnerApi(owner)),
        Housing().insert(formatHousingRecordApi(housing))
      ]);
      const housingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, owner),
        rank: -2,
        propertyRight: null
      };
      await HousingOwners().insert(formatHousingOwnerApi(housingOwner));

      await housingOwnerRepository.insert({
        ...genHousingOwnerApi(housing, owner),
        rank: 1,
        propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES)
      });

      const actual = await HousingOwners()
        .where({
          owner_id: owner.id,
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        })
        .first();
      expect(actual).toMatchObject({
        rank: -2
      });
    });
  });

  describe('fromRelativeLocationDBO', () => {
    it('maps 0 to same-address', () => {
      expect(fromRelativeLocationDBO(0)).toBe('same-address');
    });

    it('maps 1 to same-commune', () => {
      expect(fromRelativeLocationDBO(1)).toBe('same-commune');
    });

    it('maps 2 to same-department', () => {
      expect(fromRelativeLocationDBO(2)).toBe('same-department');
    });

    it('maps 3 to same-region', () => {
      expect(fromRelativeLocationDBO(3)).toBe('same-region');
    });

    it('maps 4 to metropolitan', () => {
      expect(fromRelativeLocationDBO(4)).toBe('metropolitan');
    });

    it('maps 5 to overseas', () => {
      expect(fromRelativeLocationDBO(5)).toBe('overseas');
    });

    it('maps 6 to foreign-country', () => {
      expect(fromRelativeLocationDBO(6)).toBe('foreign-country');
    });

    it('maps 7 to other', () => {
      expect(fromRelativeLocationDBO(7)).toBe('other');
    });

    it('maps null to null', () => {
      expect(fromRelativeLocationDBO(null)).toBeNull();
    });

    it('maps an unknown value to null', () => {
      expect(fromRelativeLocationDBO(99)).toBeNull();
    });
  });

  describe('toRelativeLocationDBO', () => {
    it('maps same-address to 0', () => {
      expect(toRelativeLocationDBO('same-address')).toBe(0);
    });

    it('maps same-commune to 1', () => {
      expect(toRelativeLocationDBO('same-commune')).toBe(1);
    });

    it('maps same-department to 2', () => {
      expect(toRelativeLocationDBO('same-department')).toBe(2);
    });

    it('maps same-region to 3', () => {
      expect(toRelativeLocationDBO('same-region')).toBe(3);
    });

    it('maps metropolitan to 4', () => {
      expect(toRelativeLocationDBO('metropolitan')).toBe(4);
    });

    it('maps overseas to 5', () => {
      expect(toRelativeLocationDBO('overseas')).toBe(5);
    });

    it('maps foreign-country to 6', () => {
      expect(toRelativeLocationDBO('foreign-country')).toBe(6);
    });

    it('maps other to 7', () => {
      expect(toRelativeLocationDBO('other')).toBe(7);
    });

    it('maps null to null', () => {
      expect(toRelativeLocationDBO(null)).toBeNull();
    });
  });

  describe('relativeLocationFilterToDBO', () => {
    it('maps same-address to [0]', () => {
      expect(relativeLocationFilterToDBO('same-address')).toEqual([0]);
    });

    it('maps same-commune to [1]', () => {
      expect(relativeLocationFilterToDBO('same-commune')).toEqual([1]);
    });

    it('maps same-department to [2]', () => {
      expect(relativeLocationFilterToDBO('same-department')).toEqual([2]);
    });

    it('maps same-region to [3]', () => {
      expect(relativeLocationFilterToDBO('same-region')).toEqual([3]);
    });

    it('maps other-region to [4, 5]', () => {
      expect(relativeLocationFilterToDBO('other-region')).toEqual([4, 5]);
    });

    it('maps foreign-country to [6]', () => {
      expect(relativeLocationFilterToDBO('foreign-country')).toEqual([6]);
    });

    it('maps other to [7]', () => {
      expect(relativeLocationFilterToDBO('other')).toEqual([7]);
    });
  });

  describe('saveMany', () => {
    it('should replace housing owners', async () => {
      const existingOwner = genOwnerApi();
      const housing = genHousingApi();
      await Promise.all([
        Owners().insert(formatOwnerApi(existingOwner)),
        Housing().insert(formatHousingRecordApi(housing))
      ]);
      const existingHousingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, existingOwner),
        rank: 1
      };
      await HousingOwners().insert(formatHousingOwnerApi(existingHousingOwner));

      const newOwner: OwnerApi = genOwnerApi();
      const newHousingOwner: HousingOwnerApi = {
        ...genHousingOwnerApi(housing, newOwner),
        rank: 1
      };
      await Owners().insert(formatOwnerApi(newOwner));
      const newHousingOwners: HousingOwnerApi[] = [
        { ...existingHousingOwner, rank: -2 },
        { ...newHousingOwner, rank: 1 }
      ];

      await housingOwnerRepository.saveMany(newHousingOwners);

      const actual = await HousingOwners().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actual).toHaveLength(newHousingOwners.length);
      expect(actual).toIncludeAllPartialMembers<Partial<HousingOwnerDBO>>([
        {
          owner_id: existingHousingOwner.ownerId,
          rank: -2
        },
        {
          owner_id: newHousingOwner.ownerId,
          rank: 1
        }
      ]);
    });

    it('should return affected owner IDs (existing and incoming)', async () => {
      const existingOwner = genOwnerApi();
      const newOwner = genOwnerApi();
      const housing = genHousingApi();

      await Promise.all([
        Owners().insert([
          formatOwnerApi(existingOwner),
          formatOwnerApi(newOwner)
        ]),
        Housing().insert(formatHousingRecordApi(housing))
      ]);
      await HousingOwners().insert(
        formatHousingOwnerApi({
          ...genHousingOwnerApi(housing, existingOwner),
          rank: 1
        })
      );

      const affectedOwnerIds = await housingOwnerRepository.saveMany([
        { ...genHousingOwnerApi(housing, newOwner), rank: 1 }
      ]);

      expect(affectedOwnerIds).toIncludeAllMembers([
        existingOwner.id,
        newOwner.id
      ]);
    });
  });
});
