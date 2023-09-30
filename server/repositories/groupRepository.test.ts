import { v4 as uuidv4 } from 'uuid';

import { genGroupApi, genHousingApi } from '../test/testFixtures';
import { User1, User2 } from '../../database/seeds/test/003-users';
import {
  Establishment1,
  Establishment2,
} from '../../database/seeds/test/001-establishments';
import groupRepository, {
  formatGroupApi,
  formatGroupHousingApi,
  GroupHousingDBO,
  Groups,
  GroupsHousing,
} from './groupRepository';
import { GroupApi } from '../models/GroupApi';
import { HousingApi } from '../models/HousingApi';
import { formatHousingRecordApi, Housing } from './housingRepository';

describe('Group repository', () => {
  describe('find', () => {
    const groups: GroupApi[] = [
      genGroupApi(User1, Establishment1),
      genGroupApi(User1, Establishment1),
      genGroupApi(User2, Establishment2),
    ];

    beforeEach(async () => {
      await Groups().insert(groups.map(formatGroupApi));
    });

    it('should return groups sorted by descending creation date', async () => {
      const actual = await groupRepository.find();

      expect(actual).toIncludeSameMembers(groups);
      expect(actual).toBeSortedBy('createdAt', { descending: true });
    });

    it('should return groups filtered by establishment', async () => {
      const establishment = Establishment1;
      const filteredGroups = groups.filter(
        (group) => group.establishmentId === establishment.id
      );

      const actual = await groupRepository.find({
        filters: {
          establishmentId: establishment.id,
        },
      });

      expect(actual).toIncludeSameMembers(filteredGroups);
    });
  });

  describe('findOne', () => {
    const group = genGroupApi(User1, Establishment1);

    beforeEach(async () => {
      await Groups().insert(formatGroupApi(group));
    });

    it('should return null if the group belongs to another establishment', async () => {
      const actual = await groupRepository.findOne({
        id: group.id,
        establishmentId: Establishment2.id,
      });

      expect(actual).toBeNull();
    });

    it('should return null if the group is missing', async () => {
      const actual = await groupRepository.findOne({
        id: uuidv4(),
        establishmentId: group.establishmentId,
      });

      expect(actual).toBeNull();
    });

    it('should return the group', async () => {
      const actual = await groupRepository.findOne({
        id: group.id,
        establishmentId: group.establishmentId,
      });

      expect(actual).toStrictEqual<GroupApi>({
        ...group,
        createdBy: {
          ...User1,
          password: expect.any(String),
        },
      });
    });
  });

  describe('save', () => {
    const group = genGroupApi(User1, Establishment1);
    const housingList: HousingApi[] = [
      genHousingApi(),
      genHousingApi(),
      genHousingApi(),
    ];

    beforeEach(async () => {
      await Housing().insert(housingList.map(formatHousingRecordApi));
    });

    it('should create a group that does not exist', async () => {
      await groupRepository.save(group, housingList);

      const actualGroup = await Groups()
        .where({
          id: group.id,
          establishment_id: group.establishmentId,
        })
        .first();
      expect(actualGroup).toStrictEqual(formatGroupApi(group));

      const actualHousingList = await GroupsHousing().where({
        group_id: group.id,
      });
      const ids = housingList.map((housing) => ({ housing_id: housing.id }));
      expect(actualHousingList).toBeArrayOfSize(housingList.length);
      expect(actualHousingList).toIncludeAllPartialMembers(ids);
    });

    it('should update a group that exists', async () => {
      await Groups().insert(formatGroupApi(group));
      const newHousing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(newHousing));
      const newGroup: GroupApi = {
        ...group,
        housingCount: 1,
        ownerCount: 1,
      };

      await groupRepository.save(newGroup, [newHousing]);

      const actualGroup = await Groups()
        .where({
          id: group.id,
          establishment_id: group.establishmentId,
        })
        .first();
      expect(actualGroup).toStrictEqual(formatGroupApi(newGroup));

      const actualHousingList = await GroupsHousing().where({
        group_id: group.id,
      });
      expect(actualHousingList).toBeArrayOfSize(1);
      expect(actualHousingList).toIncludeAllPartialMembers<GroupHousingDBO>([
        {
          group_id: group.id,
          housing_id: newHousing.id,
          housing_geo_code: newHousing.geoCode,
        },
      ]);
    });
  });

  describe('remove', () => {
    const group = genGroupApi(User1, Establishment1);
    const housingList: HousingApi[] = [
      genHousingApi(),
      genHousingApi(),
      genHousingApi(),
    ];

    beforeEach(async () => {
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      await GroupsHousing().insert(formatGroupHousingApi(group, housingList));
    });

    it('should remove a group if it exists', async () => {
      await groupRepository.remove(group);

      const actualGroup = await Groups()
        .where({
          id: group.id,
          establishment_id: group.establishmentId,
        })
        .first();
      expect(actualGroup).toBeUndefined();
      const actualHousingList = await GroupsHousing().where({
        group_id: group.id,
      });
      expect(actualHousingList).toBeArrayOfSize(0);
    });
  });
});
