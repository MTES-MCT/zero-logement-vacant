import {
  genHousingApi,
  genHousingOwnerApi,
  genHousingOwnerConflictApi,
  genOwnerApi,
} from '../../../test/testFixtures';
import housingOwnerConflictRepository, {
  formatHousingOwnerConflictApi,
  HousingOwnerConflictRecordDBO,
  HousingOwnerConflicts,
} from '../housingOwnerConflictRepository';
import {
  ConflictDBO,
  Conflicts,
  formatConflictApi,
} from '../conflictRepository';
import { formatOwnerApi, Owners } from '../../ownerRepository';
import { formatHousingRecordApi, Housing } from '../../housingRepository';
import {
  formatHousingOwnersApi,
  HousingOwners,
} from '../../housingOwnerRepository';
import { HousingOwnerConflictApi } from '../../../models/ConflictApi';
import { OwnerApi } from '../../../models/OwnerApi';
import { HousingApi } from '../../../models/HousingApi';

describe('Housing owner conflict repository', () => {
  describe('find', () => {
    const housing = genHousingApi();
    const owner = housing.owner;
    const conflicts = new Array(5)
      .fill(0)
      .map(() =>
        genHousingOwnerConflictApi(
          housing,
          genHousingOwnerApi(housing, owner),
          genHousingOwnerApi(housing, owner)
        )
      );

    beforeEach(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(formatHousingOwnersApi(housing, [owner]));
      await Conflicts().insert(conflicts.map(formatConflictApi));
      await HousingOwnerConflicts().insert(
        conflicts.map(formatHousingOwnerConflictApi)
      );
    });

    it('should return housing owner conflicts', async () => {
      const actual = await housingOwnerConflictRepository.find();

      expect(actual).toBeArrayOfSize(conflicts.length);
    });
  });

  describe('save', () => {
    let housing: HousingApi;
    let owners: OwnerApi[];
    let conflict: HousingOwnerConflictApi;

    beforeEach(async () => {
      housing = genHousingApi();
      owners = Array.from({ length: 2 }, () => genOwnerApi());
      conflict = genHousingOwnerConflictApi(
        housing,
        genHousingOwnerApi(housing, owners[0]),
        genHousingOwnerApi(housing, owners[1])
      );
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(formatHousingOwnersApi(housing, owners));
    });

    it('should save the conflict', async () => {
      await housingOwnerConflictRepository.save(conflict);

      const actualConflict = await Conflicts().where('id', conflict.id).first();
      expect(actualConflict).toStrictEqual<ConflictDBO>({
        id: conflict.id,
        created_at: conflict.createdAt,
      });
      const actualHousingOwnerConflict = await HousingOwnerConflicts()
        .where('conflict_id', conflict.id)
        .first();
      expect(
        actualHousingOwnerConflict
      ).toStrictEqual<HousingOwnerConflictRecordDBO>({
        conflict_id: conflict.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
        existing_owner_id: conflict.existing?.id ?? null,
        replacement_owner_id: conflict.replacement?.id ?? null,
      });
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
