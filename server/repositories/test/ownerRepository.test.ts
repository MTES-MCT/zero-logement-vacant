import ownerRepository, {
  formatOwnerApi,
  ownerTable,
} from '../ownerRepository';
import { genOwnerApi } from '../../test/testFixtures';
import db from '../db';
import { OwnerApi } from '../../models/OwnerApi';
import { startOfDay } from 'date-fns';

describe('Owner repository', () => {
  describe('findOne', () => {
    it('should find a owner without birth date', async () => {
      const owner: OwnerApi = {
        ...genOwnerApi(),
        birthDate: undefined,
      };
      await db(ownerTable).insert(formatOwnerApi(owner));

      const actual = await ownerRepository.findOne({
        fullName: owner.fullName,
        rawAddress: owner.rawAddress,
      });

      expect(actual).toStrictEqual({
        ...owner,
        administrator: null,
        birthDate: null,
      });
    });

    it('should find a owner with birth date', async () => {
      const owner: OwnerApi = genOwnerApi();
      await db(ownerTable).insert(formatOwnerApi(owner));

      const actual = await ownerRepository.findOne({
        fullName: owner.fullName,
        rawAddress: owner.rawAddress,
        birthDate: owner.birthDate,
      });

      expect(actual).toStrictEqual({
        ...owner,
        administrator: null,
        birthDate: owner.birthDate ? startOfDay(owner.birthDate) : null,
      });
    });
  });
});
