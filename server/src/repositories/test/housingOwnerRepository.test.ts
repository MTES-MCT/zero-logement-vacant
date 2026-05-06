import { faker } from '@faker-js/faker/locale/fr';
import { PROPERTY_RIGHT_VALUES } from '@zerologementvacant/models';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import housingOwnerRepository, {
  formatHousingOwnerApi,
  HousingOwnerDBO,
  HousingOwners
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

    it('should update is_multi_owner for affected owners', async () => {
      const multiOwner = genOwnerApi();
      const singleOwner = genOwnerApi();
      const housing1 = genHousingApi();
      const housing2 = genHousingApi();

      await Promise.all([
        Owners().insert([formatOwnerApi(multiOwner), formatOwnerApi(singleOwner)]),
        Housing().insert([
          formatHousingRecordApi(housing1),
          formatHousingRecordApi(housing2)
        ])
      ]);
      // multiOwner already owns housing1 at rank=1
      await HousingOwners().insert(
        formatHousingOwnerApi({ ...genHousingOwnerApi(housing1, multiOwner), rank: 1 })
      );

      // assign both owners to housing2 (multiOwner at rank=1, singleOwner at rank=2)
      await housingOwnerRepository.saveMany([
        { ...genHousingOwnerApi(housing2, multiOwner), rank: 1 },
        { ...genHousingOwnerApi(housing2, singleOwner), rank: 2 }
      ]);

      const [actualMulti, actualSingle] = await Promise.all([
        Owners().where({ id: multiOwner.id }).first(),
        Owners().where({ id: singleOwner.id }).first()
      ]);
      // multiOwner has rank=1 in housing1 and housing2 → multi owner
      expect(actualMulti?.is_multi_owner).toBe(true);
      // singleOwner only has rank=2 entries → not a multi owner
      expect(actualSingle?.is_multi_owner).toBe(false);
    });
  });
});
