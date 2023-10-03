import housingRepository, {
  formatHousingRecordApi,
  Housing,
} from '../housingRepository';
import {
  Establishment1,
  Establishment2,
} from '../../../database/seeds/test/001-establishments';
import { Housing1 } from '../../../database/seeds/test/005-housing';
import { genGroupApi, genHousingApi, oneOf } from '../../test/testFixtures';
import { User1 } from '../../../database/seeds/test/003-users';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing,
} from '../groupRepository';
import fp from 'lodash/fp';

describe('Housing repository', () => {
  describe('find', () => {
    it('should sort by geo code and id by default', async () => {
      const actual = await housingRepository.find({
        filters: {},
      });

      expect(actual).toBeSortedBy('geoCode');
      expect(actual).toBeSortedBy('id');
    });

    it('should filter by housing ids', async () => {
      const actual = await housingRepository.find({
        filters: {
          establishmentIds: [Establishment1.id],
          housingIds: [Housing1.id],
        },
      });

      expect(actual).toBeArrayOfSize(1);
      expect(actual[0]).toMatchObject({
        id: Housing1.id,
        geoCode: Housing1.geoCode,
      });
    });

    it('should filter by establishment', async () => {
      const establishment = Establishment2;

      const actual = await housingRepository.find({
        filters: {
          establishmentIds: [establishment.id],
        },
      });

      expect(actual).toSatisfyAll(
        (housing) => housing.establishmentId === establishment.id
      );
    });

    it('should filter by group', async () => {
      const group = genGroupApi(User1, Establishment1);
      const housingList = [
        genHousingApi(oneOf(Establishment1.geoCodes)),
        genHousingApi(oneOf(Establishment1.geoCodes)),
        genHousingApi(oneOf(Establishment1.geoCodes)),
      ];
      await Housing().insert(housingList.map(formatHousingRecordApi));
      await Groups().insert(formatGroupApi(group));
      await GroupsHousing().insert(formatGroupHousingApi(group, housingList));

      const actual = await housingRepository.find({
        filters: {
          groupIds: [group.id],
        },
      });

      expect(actual).toBeArrayOfSize(3);
      const ids = housingList.map(fp.pick(['id']));
      expect(actual).toIncludeAllPartialMembers(ids);
    });
  });

  describe('get', () => {
    it('should return the housing if it exists', async () => {
      const actual = await housingRepository.get(
        Housing1.id,
        Establishment1.id
      );

      expect(actual).toBeDefined();
    });

    it('should return null otherwise', async () => {
      const actual = await housingRepository.get(
        Housing1.id,
        Establishment2.id
      );

      expect(actual).toBeNull();
    });
  });
});
