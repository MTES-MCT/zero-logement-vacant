import { faker } from '@faker-js/faker/locale/fr';
import { v4 as uuidv4 } from 'uuid';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';

import {
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genOwnerApi,
  genUserApi
} from '../../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import groupRepository, {
  formatGroupApi,
  formatGroupHousingApi,
  GroupHousingDBO,
  Groups,
  GroupsHousing
} from '../groupRepository';
import { formatHousingRecordApi, Housing } from '../housingRepository';
import { HousingOwners } from '../housingOwnerRepository';
import { formatOwnerApi, Owners } from '../ownerRepository';
import { toUserDBO, Users } from '../userRepository';

describe('Group repository', () => {
  describe('find', () => {
    const establishment = genEstablishmentApi();
    const anotherEstablishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const anotherUser = genUserApi(anotherEstablishment.id);
    const groups: GroupApi[] = [
      genGroupApi(user, establishment),
      genGroupApi(user, establishment),
      genGroupApi(user, anotherEstablishment)
    ];

    beforeAll(async () => {
      await Establishments().insert(
        [establishment, anotherEstablishment].map(formatEstablishmentApi)
      );
      await Users().insert([user, anotherUser].map(toUserDBO));
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
          establishmentId: establishment.id
        }
      });

      expect(actual).toIncludeAllPartialMembers(filteredGroups);
    });

    describe('geoCodes filter', () => {
      const establishment3 = genEstablishmentApi();
      const user3 = genUserApi(establishment3.id);

      beforeAll(async () => {
        await Establishments().insert(formatEstablishmentApi(establishment3));
        await Users().insert(toUserDBO(user3));
      });

      it('should return no groups when geoCodes is empty', async () => {
        const group = genGroupApi(user3, establishment3);
        const housing = genHousingApi(establishment3.geoCodes[0]);
        await Groups().insert(formatGroupApi(group));
        await Housing().insert(formatHousingRecordApi(housing));
        await GroupsHousing().insert(formatGroupHousingApi(group, [housing]));

        const result = await groupRepository.find({
          filters: { establishmentId: establishment3.id, geoCodes: [] }
        });

        expect(result).toBeArrayOfSize(0);
      });

      it('should return only groups whose housings are all within geoCodes', async () => {
        const establishment4 = genEstablishmentApi();
        const user4 = genUserApi(establishment4.id);
        await Establishments().insert(formatEstablishmentApi(establishment4));
        await Users().insert(toUserDBO(user4));

        const inGeoCode = establishment4.geoCodes[0];
        const outGeoCode = establishment3.geoCodes[0];

        const groupIn = genGroupApi(user4, establishment4);
        const groupOut = genGroupApi(user4, establishment4);
        const housingIn = genHousingApi(inGeoCode);
        const housingOut = genHousingApi(outGeoCode);

        await Groups().insert([formatGroupApi(groupIn), formatGroupApi(groupOut)]);
        await Housing().insert([
          formatHousingRecordApi(housingIn),
          formatHousingRecordApi(housingOut)
        ]);
        await GroupsHousing().insert([
          ...formatGroupHousingApi(groupIn, [housingIn]),
          ...formatGroupHousingApi(groupOut, [housingOut])
        ]);

        const result = await groupRepository.find({
          filters: { establishmentId: establishment4.id, geoCodes: [inGeoCode] }
        });

        const ids = result.map((group) => group.id);
        expect(ids).toContain(groupIn.id);
        expect(ids).not.toContain(groupOut.id);
      });

      it('should exclude groups that have any housing outside geoCodes', async () => {
        const establishment5 = genEstablishmentApi();
        const user5 = genUserApi(establishment5.id);
        await Establishments().insert(formatEstablishmentApi(establishment5));
        await Users().insert(toUserDBO(user5));

        const inGeoCode = establishment5.geoCodes[0];
        const outGeoCode = establishment3.geoCodes[0];

        const group = genGroupApi(user5, establishment5);
        const housingIn = genHousingApi(inGeoCode);
        const housingOut = genHousingApi(outGeoCode);

        await Groups().insert(formatGroupApi(group));
        await Housing().insert([
          formatHousingRecordApi(housingIn),
          formatHousingRecordApi(housingOut)
        ]);
        await GroupsHousing().insert(
          formatGroupHousingApi(group, [housingIn, housingOut])
        );

        const result = await groupRepository.find({
          filters: { establishmentId: establishment5.id, geoCodes: [inGeoCode] }
        });

        expect(result.map((group) => group.id)).not.toContain(group.id);
      });
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
      await Users().insert([user, anotherUser].map(toUserDBO));
      await Groups().insert([group, anotherGroup].map(formatGroupApi));
    });

    it('should return null if the group belongs to another establishment', async () => {
      const actual = await groupRepository.findOne({
        id: group.id,
        establishmentId: anotherEstablishment.id
      });

      expect(actual).toBeNull();
    });

    it('should return null if the group is missing', async () => {
      const actual = await groupRepository.findOne({
        id: uuidv4(),
        establishmentId: group.establishmentId
      });

      expect(actual).toBeNull();
    });

    it('should return the group', async () => {
      const actual = await groupRepository.findOne({
        id: group.id,
        establishmentId: group.establishmentId
      });

      expect(actual).toStrictEqual<GroupApi>({
        ...group,
        createdBy: {
          ...user,
          password: expect.any(String)
        }
      });
    });

    describe('geoCodes filter', () => {
      const establishment6 = genEstablishmentApi();
      const user6 = genUserApi(establishment6.id);

      beforeAll(async () => {
        await Establishments().insert(formatEstablishmentApi(establishment6));
        await Users().insert(toUserDBO(user6));
      });

      it('should return null when geoCodes is empty', async () => {
        const targetGroup = genGroupApi(user6, establishment6);
        const housing = genHousingApi(establishment6.geoCodes[0]);
        await Groups().insert(formatGroupApi(targetGroup));
        await Housing().insert(formatHousingRecordApi(housing));
        await GroupsHousing().insert(formatGroupHousingApi(targetGroup, [housing]));

        const result = await groupRepository.findOne({
          id: targetGroup.id,
          establishmentId: establishment6.id,
          geoCodes: []
        });

        expect(result).toBeNull();
      });

      it('should return null when group has housing outside geoCodes', async () => {
        const otherEstablishment = genEstablishmentApi();
        const targetGroup = genGroupApi(user6, establishment6);
        const outsideHousing = genHousingApi(otherEstablishment.geoCodes[0]);
        await Groups().insert(formatGroupApi(targetGroup));
        await Housing().insert(formatHousingRecordApi(outsideHousing));
        await GroupsHousing().insert(formatGroupHousingApi(targetGroup, [outsideHousing]));

        const result = await groupRepository.findOne({
          id: targetGroup.id,
          establishmentId: establishment6.id,
          geoCodes: [establishment6.geoCodes[0]]
        });

        expect(result).toBeNull();
      });

      it('should return group when all housing is within geoCodes', async () => {
        const inGeoCode = establishment6.geoCodes[0];
        const targetGroup = genGroupApi(user6, establishment6);
        const housing = genHousingApi(inGeoCode);
        await Groups().insert(formatGroupApi(targetGroup));
        await Housing().insert(formatHousingRecordApi(housing));
        await GroupsHousing().insert(formatGroupHousingApi(targetGroup, [housing]));

        const result = await groupRepository.findOne({
          id: targetGroup.id,
          establishmentId: establishment6.id,
          geoCodes: [inGeoCode]
        });

        expect(result).not.toBeNull();
        expect(result?.id).toBe(targetGroup.id);
      });
    });
  });

  describe('save', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const housings: HousingApi[] = [
      genHousingApi(),
      genHousingApi(),
      genHousingApi()
    ];

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(toUserDBO(user));
      await Housing().insert(housings.map(formatHousingRecordApi));
    });

    it('should create a group that does not exist', async () => {
      const group = genGroupApi(user, establishment);
      await groupRepository.save(group, housings);

      const actualGroup = await Groups()
        .where({
          id: group.id,
          establishment_id: group.establishmentId
        })
        .first();
      expect(actualGroup).toMatchObject(formatGroupApi(group));

      const actualHousingList = await GroupsHousing().where({
        group_id: group.id
      });
      const ids = housings.map((housing) => ({ housing_id: housing.id }));
      expect(actualHousingList).toBeArrayOfSize(housings.length);
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
        ownerCount: 1
      };

      await groupRepository.save(newGroup, [newHousing]);

      const actualGroup = await Groups()
        .where({
          id: group.id,
          establishment_id: group.establishmentId
        })
        .first();
      expect(actualGroup).toMatchObject(formatGroupApi(newGroup));

      const actualHousingList = await GroupsHousing().where({
        group_id: group.id
      });
      expect(actualHousingList).toBeArrayOfSize(1);
      expect(actualHousingList).toIncludeAllPartialMembers<GroupHousingDBO>([
        {
          group_id: group.id,
          housing_id: newHousing.id,
          housing_geo_code: newHousing.geoCode
        }
      ]);
    });

    it('should remove housings if passed an empty array', async () => {
      const group = genGroupApi(user, establishment);
      await Groups().insert(formatGroupApi(group));
      await GroupsHousing().insert(formatGroupHousingApi(group, housings));

      await groupRepository.save(group, []);

      const actual = await GroupsHousing().where({
        group_id: group.id
      });
      expect(actual).toBeEmpty();
    });

    it('should replace existing housings by the new ones', async () => {
      const group = genGroupApi(user, establishment);
      await Groups().insert(formatGroupApi(group));
      await GroupsHousing().insert(formatGroupHousingApi(group, housings));
      const newHousings = faker.helpers.multiple(() => genHousingApi());
      await Housing().insert(newHousings.map(formatHousingRecordApi));

      await groupRepository.save(group, newHousings);

      const actual = await GroupsHousing().where({
        group_id: group.id
      });
      expect(actual).toBeArrayOfSize(newHousings.length);
      newHousings.forEach((housing) => {
        expect(actual).toPartiallyContain({
          group_id: group.id,
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        });
      });
    });
  });

  describe('archive', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeEach(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(toUserDBO(user));
    });

    it('should archive a group', async () => {
      const group = genGroupApi(user, establishment);
      await Groups().insert(formatGroupApi(group));

      const archived = await groupRepository.archive(group);

      expect(archived).toStrictEqual({
        ...group,
        archivedAt: expect.any(Date)
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
      genHousingApi()
    ];

    beforeEach(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(toUserDBO(user));
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      await GroupsHousing().insert(formatGroupHousingApi(group, housingList));
    });

    it('should remove a group if it exists', async () => {
      await groupRepository.remove(group);

      const actualGroup = await Groups()
        .where({
          id: group.id,
          establishment_id: group.establishmentId
        })
        .first();
      expect(actualGroup).toBeUndefined();
      const actualHousingList = await GroupsHousing().where({
        group_id: group.id
      });
      expect(actualHousingList).toBeArrayOfSize(0);
    });
  });

  describe('counts', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeEach(async () => {
      await Establishments()
        .insert(formatEstablishmentApi(establishment))
        .onConflict('id')
        .ignore();
      await Users().insert(toUserDBO(user)).onConflict('id').ignore();
    });

    it('should expose housingCount from the database column', async () => {
      const group = genGroupApi(user, establishment);
      await Groups().insert({ ...formatGroupApi(group), housing_count: 7 });

      const result = await groupRepository.find({
        filters: { establishmentId: establishment.id }
      });
      const found = result.find((g) => g.id === group.id);

      expect(found?.housingCount).toBe(7);
    });

    it('should expose ownerCount from the database column', async () => {
      const group = genGroupApi(user, establishment);
      await Groups().insert({ ...formatGroupApi(group), owner_count: 4 });

      const result = await groupRepository.find({
        filters: { establishmentId: establishment.id }
      });
      const found = result.find((g) => g.id === group.id);

      expect(found?.ownerCount).toBe(4);
    });

    it('should update housingCount via trigger when housing is added', async () => {
      const group = genGroupApi(user, establishment);
      const housing = genHousingApi();
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(formatHousingRecordApi(housing));

      await groupRepository.addHousing(group, [housing]);

      const result = await groupRepository.find({
        filters: { establishmentId: establishment.id }
      });
      const found = result.find((g) => g.id === group.id);
      expect(found?.housingCount).toBe(1);
    });

    it('should update ownerCount via trigger when a rank-1 owner is added', async () => {
      const group = genGroupApi(user, establishment);
      const housing = genHousingApi();
      const owner = genOwnerApi();
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(formatHousingRecordApi(housing));
      await GroupsHousing().insert(formatGroupHousingApi(group, [housing]));
      await Owners().insert(formatOwnerApi(owner));

      // Insert directly into owners_housing — the trigger fires on this insert
      await HousingOwners().insert({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1,
        start_date: null,
        end_date: null,
        origin: null,
        idprocpte: null,
        idprodroit: null,
        locprop_source: null,
        locprop_relative_ban: null,
        locprop_distance_ban: null,
        property_right: null
      });

      const result = await groupRepository.find({
        filters: { establishmentId: establishment.id }
      });
      const found = result.find((g) => g.id === group.id);
      expect(found?.ownerCount).toBe(1);
    });
  });
});
