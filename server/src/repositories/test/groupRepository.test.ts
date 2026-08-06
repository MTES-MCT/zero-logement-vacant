import { v4 as uuidv4 } from 'uuid';

import { kysely } from '~/infra/database/kysely';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { genGroupApi } from '~/test/testFixtures';

import groupRepository, { toGroupDBO } from '../groupRepository';

describe('Group repository', () => {
  describe('find', () => {
    let establishment: EstablishmentApi;
    let anotherEstablishment: EstablishmentApi;
    let user: UserApi;
    let groups: GroupApi[];

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      anotherEstablishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
      await factories.user.create({ establishmentId: anotherEstablishment.id });
      groups = await Promise.all([
        factories
          .group(establishment)
          .create({}, { associations: { createdBy: user } }),
        factories
          .group(establishment)
          .create({}, { associations: { createdBy: user } }),
        factories
          .group(anotherEstablishment)
          .create({}, { associations: { createdBy: user } })
      ]);
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
      let establishment3: EstablishmentApi;
      let user3: UserApi;

      beforeAll(async () => {
        establishment3 = await factories.establishment.create();
        user3 = await factories.user.create({
          establishmentId: establishment3.id
        });
      });

      it('should return no groups when geoCodes is empty', async () => {
        const housing = await factories.housing.create({
          geoCode: establishment3.geoCodes[0]
        });
        const group = await factories
          .group(establishment3)
          .create({}, { associations: { createdBy: user3 } });
        await kysely
          .insertInto('groupsHousing')
          .values({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const result = await groupRepository.find({
          filters: { establishmentId: establishment3.id, geoCodes: [] }
        });

        expect(result).toBeArrayOfSize(0);
      });

      it('should return only groups whose housings are all within geoCodes', async () => {
        const establishment4 = await factories.establishment.create();
        const user4 = await factories.user.create({
          establishmentId: establishment4.id
        });

        const inGeoCode = establishment4.geoCodes[0];
        const outGeoCode = establishment3.geoCodes[0];

        const groupIn = await factories
          .group(establishment4)
          .create({}, { associations: { createdBy: user4 } });
        const groupOut = await factories
          .group(establishment4)
          .create({}, { associations: { createdBy: user4 } });
        const housingIn = await factories.housing.create({
          geoCode: inGeoCode
        });
        const housingOut = await factories.housing.create({
          geoCode: outGeoCode
        });

        await kysely
          .insertInto('groupsHousing')
          .values([
            {
              groupId: groupIn.id,
              housingId: housingIn.id,
              housingGeoCode: housingIn.geoCode
            },
            {
              groupId: groupOut.id,
              housingId: housingOut.id,
              housingGeoCode: housingOut.geoCode
            }
          ])
          .execute();

        const result = await groupRepository.find({
          filters: { establishmentId: establishment4.id, geoCodes: [inGeoCode] }
        });

        const ids = result.map((group) => group.id);
        expect(ids).toContain(groupIn.id);
        expect(ids).not.toContain(groupOut.id);
      });

      it('should exclude groups that have any housing outside geoCodes', async () => {
        const establishment5 = await factories.establishment.create();
        const user5 = await factories.user.create({
          establishmentId: establishment5.id
        });

        const inGeoCode = establishment5.geoCodes[0];
        const outGeoCode = establishment3.geoCodes[0];

        const group = await factories
          .group(establishment5)
          .create({}, { associations: { createdBy: user5 } });
        const housingIn = await factories.housing.create({
          geoCode: inGeoCode
        });
        const housingOut = await factories.housing.create({
          geoCode: outGeoCode
        });

        await kysely
          .insertInto('groupsHousing')
          .values([
            {
              groupId: group.id,
              housingId: housingIn.id,
              housingGeoCode: housingIn.geoCode
            },
            {
              groupId: group.id,
              housingId: housingOut.id,
              housingGeoCode: housingOut.geoCode
            }
          ])
          .execute();

        const result = await groupRepository.find({
          filters: { establishmentId: establishment5.id, geoCodes: [inGeoCode] }
        });

        expect(result.map((group) => group.id)).not.toContain(group.id);
      });
    });
  });

  describe('findOne', () => {
    let establishment: EstablishmentApi;
    let anotherEstablishment: EstablishmentApi;
    let user: UserApi;
    let group: GroupApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      anotherEstablishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
      await factories.user.create({ establishmentId: anotherEstablishment.id });
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      await factories
        .group(anotherEstablishment)
        .create({}, { associations: { createdBy: user } });
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
      let establishment6: EstablishmentApi;
      let user6: UserApi;

      beforeAll(async () => {
        establishment6 = await factories.establishment.create();
        user6 = await factories.user.create({
          establishmentId: establishment6.id
        });
      });

      it('should return null when geoCodes is empty', async () => {
        const housing = await factories.housing.create({
          geoCode: establishment6.geoCodes[0]
        });
        const targetGroup = await factories
          .group(establishment6)
          .create({}, { associations: { createdBy: user6 } });
        await kysely
          .insertInto('groupsHousing')
          .values({
            groupId: targetGroup.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const result = await groupRepository.findOne({
          id: targetGroup.id,
          establishmentId: establishment6.id,
          geoCodes: []
        });

        expect(result).toBeNull();
      });

      it('should return null when group has housing outside geoCodes', async () => {
        const targetGroup = await factories
          .group(establishment6)
          .create({}, { associations: { createdBy: user6 } });
        const outsideHousing = await factories.housing.create();
        await kysely
          .insertInto('groupsHousing')
          .values({
            groupId: targetGroup.id,
            housingId: outsideHousing.id,
            housingGeoCode: outsideHousing.geoCode
          })
          .execute();

        const result = await groupRepository.findOne({
          id: targetGroup.id,
          establishmentId: establishment6.id,
          geoCodes: [establishment6.geoCodes[0]]
        });

        expect(result).toBeNull();
      });

      it('should return group when all housing is within geoCodes', async () => {
        const inGeoCode = establishment6.geoCodes[0];
        const targetGroup = await factories
          .group(establishment6)
          .create({}, { associations: { createdBy: user6 } });
        const housing = await factories.housing.create({ geoCode: inGeoCode });
        await kysely
          .insertInto('groupsHousing')
          .values({
            groupId: targetGroup.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

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
    let establishment: EstablishmentApi;
    let user: UserApi;
    let housings: HousingApi[];

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
      housings = await factories.housing.createList(3);
    });

    it('should create a group that does not exist', async () => {
      const group = genGroupApi(user, establishment);
      await groupRepository.save(group, housings);

      const actualGroup = await kysely
        .selectFrom('groups')
        .selectAll('groups')
        .where('id', '=', group.id)
        .where('establishmentId', '=', group.establishmentId)
        .executeTakeFirst();
      expect(actualGroup).toMatchObject(toGroupDBO(group));

      const actualHousings = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', group.id)
        .execute();
      const ids = housings.map((housing) => ({ housingId: housing.id }));
      expect(actualHousings).toBeArrayOfSize(housings.length);
      expect(actualHousings).toIncludeAllPartialMembers(ids);
    });

    it('should update a group that exists', async () => {
      const group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      const newHousing = await factories.housing.create();
      const newGroup: GroupApi = {
        ...group,
        housingCount: 1,
        ownerCount: 1
      };

      await groupRepository.save(newGroup, [newHousing]);

      const actualGroup = await kysely
        .selectFrom('groups')
        .selectAll('groups')
        .where('id', '=', group.id)
        .where('establishmentId', '=', group.establishmentId)
        .executeTakeFirst();
      expect(actualGroup).toMatchObject(toGroupDBO(newGroup));

      const actualHousings = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', group.id)
        .execute();
      expect(actualHousings).toBeArrayOfSize(1);
      expect(actualHousings).toIncludeAllPartialMembers([
        {
          groupId: group.id,
          housingId: newHousing.id,
          housingGeoCode: newHousing.geoCode
        }
      ]);
    });

    it('should remove housings if passed an empty array', async () => {
      const group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .insertInto('groupsHousing')
        .values(
          housings.map((housing) => ({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();

      await groupRepository.save(group, []);

      const actual = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', group.id)
        .execute();
      expect(actual).toBeEmpty();
    });

    it('should replace existing housings by the new ones', async () => {
      const group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .insertInto('groupsHousing')
        .values(
          housings.map((housing) => ({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
      const newHousings = await factories.housing.createList(3);

      await groupRepository.save(group, newHousings);

      const actual = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', group.id)
        .execute();
      expect(actual).toBeArrayOfSize(newHousings.length);
      newHousings.forEach((housing) => {
        expect(actual).toPartiallyContain({
          groupId: group.id,
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        });
      });
    });
  });

  describe('removeHousing', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
    });

    async function createGroupWithHousings(): Promise<{
      group: GroupApi;
      housings: HousingApi[];
    }> {
      const group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      const housings = await factories.housing.createList(3);
      await kysely
        .insertInto('groupsHousing')
        .values(
          housings.map((housing) => ({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
      return { group, housings };
    }

    it('should remove the given housings from the group', async () => {
      const { group, housings } = await createGroupWithHousings();
      const [removed, ...kept] = housings;

      await groupRepository.removeHousing(group, [removed]);

      const actual = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', group.id)
        .execute();
      expect(actual).toBeArrayOfSize(kept.length);
      expect(actual).not.toPartiallyContain({
        groupId: group.id,
        housingId: removed.id,
        housingGeoCode: removed.geoCode
      });
    });

    it('should do nothing when the housing list is empty', async () => {
      const { group, housings } = await createGroupWithHousings();

      await groupRepository.removeHousing(group, []);

      const actual = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', group.id)
        .execute();
      expect(actual).toBeArrayOfSize(housings.length);
    });
  });

  describe('archive', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;

    beforeEach(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
    });

    it('should archive a group', async () => {
      const group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });

      const archived = await groupRepository.archive(group);

      expect(archived).toStrictEqual({
        ...group,
        archivedAt: expect.any(Date)
      });
    });
  });

  describe('remove', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;
    let group: GroupApi;

    beforeEach(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      const housings = await factories.housing.createList(3);
      await kysely
        .insertInto('groupsHousing')
        .values(
          housings.map((housing) => ({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
    });

    it('should remove a group if it exists', async () => {
      await groupRepository.remove(group);

      const actualGroup = await kysely
        .selectFrom('groups')
        .selectAll('groups')
        .where('id', '=', group.id)
        .where('establishmentId', '=', group.establishmentId)
        .executeTakeFirst();
      expect(actualGroup).toBeUndefined();
      const actualHousings = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', group.id)
        .execute();
      expect(actualHousings).toBeArrayOfSize(0);
    });
  });

  describe('counts', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
    });

    it('should expose housingCount from the database column', async () => {
      const group = genGroupApi(user, establishment);
      await kysely
        .insertInto('groups')
        .values({ ...toGroupDBO(group), housingCount: 7 })
        .execute();

      const result = await groupRepository.find({
        filters: { establishmentId: establishment.id }
      });
      const found = result.find((g) => g.id === group.id);

      expect(found?.housingCount).toBe(7);
    });

    it('should expose ownerCount from the database column', async () => {
      const group = genGroupApi(user, establishment);
      await kysely
        .insertInto('groups')
        .values({ ...toGroupDBO(group), ownerCount: 4 })
        .execute();

      const result = await groupRepository.find({
        filters: { establishmentId: establishment.id }
      });
      const found = result.find((g) => g.id === group.id);

      expect(found?.ownerCount).toBe(4);
    });

    it('should update housingCount via trigger when housing is added', async () => {
      const group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      const housing = await factories.housing.create();

      await groupRepository.addHousing(group, [housing]);

      const result = await groupRepository.find({
        filters: { establishmentId: establishment.id }
      });
      const found = result.find((g) => g.id === group.id);
      expect(found?.housingCount).toBe(1);
    });

    it('should update ownerCount via trigger when a rank-1 owner is added', async () => {
      const group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      const housing = await factories.housing.create();
      const owner = await factories.owner.create();
      await kysely
        .insertInto('groupsHousing')
        .values({
          groupId: group.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      // Insert directly into ownersHousing — the trigger fires on this insert.
      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      const result = await groupRepository.find({
        filters: { establishmentId: establishment.id }
      });
      const found = result.find((g) => g.id === group.id);
      expect(found?.ownerCount).toBe(1);
    });
  });
});
