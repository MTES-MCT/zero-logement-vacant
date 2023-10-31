import {
  genHousingApi,
  genHousingOwnerConflictApi,
} from '../../../test/testFixtures';
import housingOwnerConflictRepository, {
  formatHousingOwnerConflictApi,
  HousingOwnerConflictRecordDBO,
  HousingOwnerConflicts,
} from '../housingOwnerConflictRepository';
import { Conflicts, formatConflictApi } from '../conflictRepository';
import { formatOwnerApi, Owners } from '../../ownerRepository';
import { formatHousingRecordApi, Housing } from '../../housingRepository';

describe.skip('Housing owner conflict repository', () => {
  describe('find', () => {
    it('should return housing owner conflicts', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));
      const conflicts = new Array(5)
        .fill(0)
        .map(() => genHousingOwnerConflictApi(housing));
      const owner = housing.owner;
      await Owners().insert(formatOwnerApi(owner));
      await Conflicts().insert(conflicts.map(formatConflictApi));
      await HousingOwnerConflicts().insert(
        conflicts.map(formatHousingOwnerConflictApi)
      );

      const actual = await housingOwnerConflictRepository.find();

      expect(actual).toIncludeSameMembers(conflicts);
    });
  });

  describe('save', () => {
    const housing = genHousingApi();
    const conflict = genHousingOwnerConflictApi(housing);

    beforeEach(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(housing.owner));
      await HousingOwnerConflicts().insert(
        formatHousingOwnerConflictApi(conflict)
      );
    });

    it('should save the conflict', async () => {
      await housingOwnerConflictRepository.save(conflict);

      const actual = await Conflicts().where('id', conflict.id).first();
      expect(actual).toMatchObject(conflict);
    });

    it('should save the housing owner conflict', async () => {
      await housingOwnerConflictRepository.save(conflict);

      const actual = await HousingOwnerConflicts()
        .where({
          conflict_id: conflict.id,
        })
        .first();
      expect(actual).toStrictEqual<HousingOwnerConflictRecordDBO>({
        conflict_id: conflict.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
        existing_owner_id: conflict.existing?.id ?? null,
        replacement_owner_id: conflict.replacement?.id ?? null,
      });
    });
  });
});
