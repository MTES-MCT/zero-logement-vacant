import { faker } from '@faker-js/faker/locale/fr';
import { OWNER_RANKS, PROPERTY_RIGHT_VALUES } from '@zerologementvacant/models';
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
import { genHousingApi, genOwnerApi } from '~/test/testFixtures';

describe('housingOwnerRepository', () => {
  describe('findByOwner', () => {
    it('should return a housing owner with their housings', async () => {
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
      const housings = faker.helpers.multiple(() => genHousingApi());
      await Housing().insert(housings.map(formatHousingRecordApi));
      const housingOwners: ReadonlyArray<HousingOwnerApi> = housings.map(
        (housing) => ({
          ...owner,
          ownerId: owner.id,
          housingGeoCode: housing.geoCode,
          housingId: housing.id,
          rank: faker.helpers.arrayElement(OWNER_RANKS),
          propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES)
        })
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
          id: owner.id,
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
        ...owner,
        rank: -2,
        ownerId: owner.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        propertyRight: null
      };
      await HousingOwners().insert(formatHousingOwnerApi(housingOwner));

      await housingOwnerRepository.insert({
        ...owner,
        rank: -2,
        ownerId: owner.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
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
        ...owner,
        rank: -2,
        ownerId: owner.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        propertyRight: null
      };
      await HousingOwners().insert(formatHousingOwnerApi(housingOwner));

      await housingOwnerRepository.insert({
        ...owner,
        rank: 1,
        ownerId: owner.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
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
        ...existingOwner,
        rank: 1,
        ownerId: existingOwner.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES)
      };
      await HousingOwners().insert(formatHousingOwnerApi(existingHousingOwner));

      const newOwner: OwnerApi = genOwnerApi();
      const newHousingOwner: HousingOwnerApi = {
        ...newOwner,
        rank: 1,
        ownerId: newOwner.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES)
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
  });
});
