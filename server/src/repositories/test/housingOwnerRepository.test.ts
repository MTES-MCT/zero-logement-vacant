import housingOwnerRepository, {
  formatHousingOwnerApi,
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import { genHousingApi, genOwnerApi } from '~/test/testFixtures';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';

describe('housingOwnerRepository', () => {
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
        housingGeoCode: housing.geoCode
      };
      await HousingOwners().insert(formatHousingOwnerApi(existingHousingOwner));

      const newOwner: OwnerApi = genOwnerApi();
      const newHousingOwner: HousingOwnerApi = {
        ...newOwner,
        rank: 1,
        ownerId: newOwner.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
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
