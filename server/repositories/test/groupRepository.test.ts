import { v4 as uuidv4 } from 'uuid';

import {
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genUserApi,
} from '../../test/testFixtures';
import groupRepository, {
  formatGroupApi,
  formatGroupHousingApi,
  GroupHousingDBO,
  Groups,
  GroupsHousing,
} from '../groupRepository';
import { GroupApi } from '../../models/GroupApi';
import { HousingApi } from '../../models/HousingApi';
import { formatHousingRecordApi, Housing } from '../housingRepository';
import {
  Establishments,
  formatEstablishmentApi,
} from '../establishmentRepository';
import { formatUserApi, Users } from '../userRepository';

describe('Group repository', () => {
  describe('find', () => {
    const establishment = genEstablishmentApi();
    const anotherEstablishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const anotherUser = genUserApi(anotherEstablishment.id);
    const groups: GroupApi[] = [
      genGroupApi(user, establishment),
      genGroupApi(user, establishment),
      genGroupApi(user, anotherEstablishment),
    ];

    beforeAll(async () => {
      await Establishments().insert(
        [establishment, anotherEstablishment].map(formatEstablishmentApi)
      );
      await Users().insert([user, anotherUser].map(formatUserApi));
      await Groups().insert(groups.map(formatGroupApi));
    });

    it('should return groups sorted by descending creation date', async () => {
      const actual = await groupRepository.find();

      expect(actual).toIncludeAllMembers(groups);
      expect(actual).toBeSortedBy('createdAt', { descending: true });
    });

    it('should return groups filtered by establishment', async () => {
      const filteredGroups = groups.filter(
        (group) => group.establishmentId === establishment.id
      );

      const actual = await groupRepository.find({
        filters: {
          establishmentId: establishment.id,
        },
      });

      expect(actual).toIncludeAllPartialMembers(filteredGroups);
    });
  });

  describe('findOne', () => {
    const establishment = genEstablishmentApi();
    const anotherEstablishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const anotherUser = genUserApi(anotherEstablishment.id);
    const group = genGroupApi(user, establishment);
    const anotherGroup = genGroupApi(user, anotherEstablishment);

    beforeAll(async () => {
      await Establishments().insert(
        [establishment, anotherEstablishment].map(formatEstablishmentApi)
      );
      await Users().insert([user, anotherUser].map(formatUserApi));
      await Groups().insert([group, anotherGroup].map(formatGroupApi));
    });

    it('should return null if the group belongs to another establishment', async () => {
      const actual = await groupRepository.findOne({
        id: group.id,
        establishmentId: anotherEstablishment.id,
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
          ...user,
          password: expect.any(String),
        },
      });
    });
  });

  describe('save', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const housingList: HousingApi[] = [
      genHousingApi(),
      genHousingApi(),
      genHousingApi(),
    ];

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
      await Housing().insert(housingList.map(formatHousingRecordApi));
    });

    it('should create a group that does not exist', async () => {
      const group = genGroupApi(user, establishment);
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
      const group = genGroupApi(user, establishment);
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

  describe('archive', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeEach(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
    });

    it('should archive a group', async () => {
      const group = genGroupApi(user, establishment);
      await Groups().insert(formatGroupApi(group));

      const archived = await groupRepository.archive(group);

      expect(archived).toStrictEqual({
        ...group,
        archivedAt: expect.any(Date),
      });
    });
  });

  describe('remove', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const group = genGroupApi(user, establishment);
    const housingList: HousingApi[] = [
      genHousingApi(),
      genHousingApi(),
      genHousingApi(),
    ];

    beforeEach(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
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
