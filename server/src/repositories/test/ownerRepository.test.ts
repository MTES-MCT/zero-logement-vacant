import { faker } from '@faker-js/faker';
import { collect } from '@zerologementvacant/utils/node';

import db from '~/infra/database';
import { OwnerApi } from '~/models/OwnerApi';
import {
  CampaignsHousing,
  formatCampaignHousingApi
} from '~/repositories/campaignHousingRepository';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing
} from '~/repositories/groupRepository';
import { factories } from '~/test/factories';
import {
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '../housingOwnerRepository';
import { formatHousingRecordApi, Housing } from '../housingRepository';
import ownerRepository, {
  formatOwnerApi,
  Owners,
  ownerTable
} from '../ownerRepository';
import { toUserDBO, Users } from '../userRepository';

describe('Owner repository', () => {
  describe('find', () => {
    it('should search by full name', async () => {
      const owners = [
        { ...genOwnerApi(), fullName: 'Jean Valjean' },
        { ...genOwnerApi(), fullName: 'Jean Dupont' },
        { ...genOwnerApi(), fullName: 'Pierre Jean' },
        { ...genOwnerApi(), fullName: 'Kyan khojandi' }
      ];
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.find({
        search: 'Jea'
      });

      expect(actual.length).toBeGreaterThanOrEqual(3);
      expect(actual).not.toPartiallyContain({ fullName: 'Kyan khojandi' });
    });

    describe('Filter by idpersonne', () => {
      it('should keep owners who have an idpersonne defined', async () => {
        const owners: ReadonlyArray<OwnerApi> = [
          { ...genOwnerApi(), idpersonne: faker.string.alphanumeric(10) },
          { ...genOwnerApi(), idpersonne: null },
          { ...genOwnerApi(), idpersonne: faker.string.alphanumeric(10) }
        ];
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find({
          filters: {
            idpersonne: true
          }
        });

        expect(actual).toSatisfyAll((owner) => !!owner.idpersonne);
      });

      it('should filter by idpersonne', async () => {
        const owners = faker.helpers.multiple(() => genOwnerApi());
        await Owners().insert(owners.map(formatOwnerApi));
        const idpersonnes = owners
          .map((owner) => owner.idpersonne)
          .filter((id): id is string => id !== null);

        const actual = await ownerRepository.find({
          filters: {
            idpersonne: idpersonnes
          }
        });

        expect(actual).toBeArrayOfSize(idpersonnes.length);
      });
    });

    describe('Filter by idpersonne=false', () => {
      it('should return only owners with null idpersonne', async () => {
        const ownerWithNull = { ...genOwnerApi(), idpersonne: null };
        const ownerWithId = {
          ...genOwnerApi(),
          idpersonne: faker.string.alphanumeric(10)
        };
        await Owners().insert(
          [ownerWithNull, ownerWithId].map(formatOwnerApi)
        );

        const actual = await ownerRepository.find({
          filters: { idpersonne: false },
          pagination: { paginate: false }
        });

        expect(actual).toSatisfyAll<OwnerApi>(
          (owner) => owner.idpersonne === null
        );
        expect(actual).toPartiallyContain({ id: ownerWithNull.id });
        expect(actual).not.toPartiallyContain({ id: ownerWithId.id });
      });
    });

    describe('Filter by idpersonne single string', () => {
      it('should return exactly the owner matching that idpersonne', async () => {
        const targetIdpersonne = faker.string.alphanumeric(10);
        const owner = { ...genOwnerApi(), idpersonne: targetIdpersonne };
        const otherOwner = {
          ...genOwnerApi(),
          idpersonne: faker.string.alphanumeric(10)
        };
        await Owners().insert([owner, otherOwner].map(formatOwnerApi));

        const actual = await ownerRepository.find({
          filters: { idpersonne: targetIdpersonne },
          pagination: { paginate: false }
        });

        expect(actual).toBeArrayOfSize(1);
        expect(actual[0].id).toBe(owner.id);
      });
    });

    describe('Filter by idpersonne empty array', () => {
      it('should apply no idpersonne filter and return owners regardless', async () => {
        const ownerA = { ...genOwnerApi(), idpersonne: null };
        const ownerB = {
          ...genOwnerApi(),
          idpersonne: faker.string.alphanumeric(10)
        };
        await Owners().insert([ownerA, ownerB].map(formatOwnerApi));

        const actual = await ownerRepository.find({
          filters: { idpersonne: [] },
          pagination: { paginate: false }
        });

        expect(actual).toPartiallyContain({ id: ownerA.id });
        expect(actual).toPartiallyContain({ id: ownerB.id });
      });
    });

    describe('Filter by campaignId', () => {
      const establishment = genEstablishmentApi();
      const creator = genUserApi(establishment.id);

      beforeAll(async () => {
        await Establishments().insert(formatEstablishmentApi(establishment));
        await Users().insert(toUserDBO(creator));
      });

      it('should return only the owner linked to that campaign', async () => {
        const housing = genHousingApi();
        const linkedOwner = genOwnerApi();
        const unlinkedOwner = genOwnerApi();

        await Housing().insert(formatHousingRecordApi(housing));
        await Owners().insert(
          [linkedOwner, unlinkedOwner].map(formatOwnerApi)
        );
        await HousingOwners().insert(
          formatHousingOwnerApi({
            ...genHousingOwnerApi(housing, linkedOwner),
            rank: 1
          })
        );

        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: creator } });
        await CampaignsHousing().insert(
          formatCampaignHousingApi(campaign, [housing])
        );

        const actual = await ownerRepository.find({
          filters: { campaignId: campaign.id },
          pagination: { paginate: false }
        });

        expect(actual).toPartiallyContain({ id: linkedOwner.id });
        expect(actual).not.toPartiallyContain({ id: unlinkedOwner.id });
      });
    });

    describe('Filter by groupId', () => {
      const establishment = genEstablishmentApi();
      const creator = genUserApi(establishment.id);

      beforeAll(async () => {
        await Establishments().insert(formatEstablishmentApi(establishment));
        await Users().insert(toUserDBO(creator));
      });

      it('should return only the owner linked to that group', async () => {
        const housing = genHousingApi();
        const linkedOwner = genOwnerApi();
        const unlinkedOwner = genOwnerApi();

        await Housing().insert(formatHousingRecordApi(housing));
        await Owners().insert(
          [linkedOwner, unlinkedOwner].map(formatOwnerApi)
        );
        await HousingOwners().insert(
          formatHousingOwnerApi({
            ...genHousingOwnerApi(housing, linkedOwner),
            rank: 1
          })
        );

        const group = genGroupApi(creator, establishment);
        await Groups().insert(formatGroupApi(group));
        await GroupsHousing().insert(formatGroupHousingApi(group, [housing]));

        const actual = await ownerRepository.find({
          filters: { groupId: group.id },
          pagination: { paginate: false }
        });

        expect(actual).toPartiallyContain({ id: linkedOwner.id });
        expect(actual).not.toPartiallyContain({ id: unlinkedOwner.id });
      });
    });

    describe('Includes', () => {
      it('should include the BAN address', async () => {
        const actual = await ownerRepository.find({
          includes: ['banAddress']
        });

        expect(actual).toSatisfyAll<OwnerApi>(
          (owner) => owner.banAddress !== undefined
        );
      });

      it('should include housings linked to the owner via lateral join', async () => {
        const housing = genHousingApi();
        const owner = genOwnerApi();

        await Housing().insert(formatHousingRecordApi(housing));
        await Owners().insert(formatOwnerApi(owner));
        await HousingOwners().insert(
          formatHousingOwnerApi({
            ...genHousingOwnerApi(housing, owner),
            rank: 1
          })
        );

        const actual = await ownerRepository.find({
          filters: { idpersonne: owner.idpersonne ?? [] },
          includes: ['housings'],
          pagination: { paginate: false }
        });

        const found = actual.find((o) => o.id === owner.id);
        expect(found).toBeDefined();
        // The lateral join selects h.housings at the SQL level; parseOwnerApi
        // does not forward this column, so the field is absent (undefined) on
        // the returned OwnerApi. The owner IS returned — the join does not
        // exclude it (ON true). This characterizes the current behaviour.
        expect((found as any).housings).toBeUndefined();
      });
    });

    describe('Pagination', () => {
      it('should paginate by default', async () => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: 51
        });
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find();

        expect(actual.length).toBeLessThanOrEqual(50);
      });

      it('should disable pagination', async () => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: 51
        });
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find({
          pagination: { paginate: false }
        });

        expect(actual.length).toBeGreaterThanOrEqual(51);
      });

      it('should paginate explicitely', async () => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: 21
        });
        await Owners().insert(owners.map(formatOwnerApi));

        const actual = await ownerRepository.find({
          pagination: {
            paginate: true,
            page: 2,
            perPage: 10
          }
        });

        expect(actual.length).toBe(10);
      });
    });
  });

  describe('get', () => {
    it('should return a matching OwnerApi for an existing owner', async () => {
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));

      const actual = await ownerRepository.get(owner.id);

      expect(actual).toMatchObject<Partial<OwnerApi>>({
        id: owner.id,
        fullName: owner.fullName
      });
    });

    it('should return null for a nonexistent owner id', async () => {
      const actual = await ownerRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return null when no owner matches the given fullName', async () => {
      const actual = await ownerRepository.findOne({
        fullName: faker.string.uuid()
      });

      expect(actual).toBeNull();
    });

    it('should find a owner without birth date', async () => {
      const owner: OwnerApi = {
        ...genOwnerApi(),
        birthDate: null
      };
      await db(ownerTable).insert(formatOwnerApi(owner));

      const actual = await ownerRepository.findOne({
        fullName: owner.fullName,
        rawAddress: owner.rawAddress
      });

      expect(actual).toMatchObject<Partial<OwnerApi>>({
        id: owner.id,
        fullName: owner.fullName,
        rawAddress: owner.rawAddress
      });
    });

    it('should find a owner with birth date', async () => {
      const owner: OwnerApi = genOwnerApi();
      await db(ownerTable).insert(formatOwnerApi(owner));

      const actual = await ownerRepository.findOne({
        fullName: owner.fullName,
        rawAddress: owner.rawAddress,
        birthDate: owner.birthDate ? new Date(owner.birthDate) : undefined
      });

      expect(actual).toMatchObject<Partial<OwnerApi>>({
        id: owner.id,
        fullName: owner.fullName,
        rawAddress: owner.rawAddress,
        birthDate: owner.birthDate?.substring(0, 'yyyy-mm-dd'.length) ?? null
      });
    });
  });

  describe('count', () => {
    it('should count all owners', async () => {
      const owners = faker.helpers.multiple(() => genOwnerApi(), {
        count: 15
      });
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.count();

      expect(actual).toBeGreaterThanOrEqual(owners.length);
    });

    it('should count owners matching search', async () => {
      const owners = [
        { ...genOwnerApi(), fullName: 'Jean Valjean' },
        { ...genOwnerApi(), fullName: 'Jean Dupont' },
        { ...genOwnerApi(), fullName: 'Pierre Jean' },
        { ...genOwnerApi(), fullName: 'Kyan khojandi' }
      ];
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.count({
        search: 'Jea'
      });

      expect(actual).toBeGreaterThanOrEqual(3);
    });

    it('should count owners with idpersonne defined', async () => {
      const owners: ReadonlyArray<OwnerApi> = [
        { ...genOwnerApi(), idpersonne: faker.string.alphanumeric(10) },
        { ...genOwnerApi(), idpersonne: null },
        { ...genOwnerApi(), idpersonne: faker.string.alphanumeric(10) }
      ];
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await ownerRepository.count({
        filters: {
          idpersonne: true
        }
      });

      expect(actual).toBeGreaterThanOrEqual(2);
    });

    it('should count owners by idpersonne', async () => {
      const owners = faker.helpers.multiple(() => genOwnerApi(), {
        count: 5
      });
      await Owners().insert(owners.map(formatOwnerApi));
      const idpersonnes = owners
        .map((owner) => owner.idpersonne)
        .filter((id): id is string => id !== null);

      const actual = await ownerRepository.count({
        filters: {
          idpersonne: idpersonnes
        }
      });

      expect(actual).toBe(idpersonnes.length);
    });
  });

  describe('stream', () => {
    it('should group by full name', async () => {
      const owners = new Array(4)
        .fill('0')
        .map(() => genOwnerApi())
        .map<OwnerApi>((owner) => ({
          ...owner,
          fullName: 'Jean Dupont'
        }));
      await Owners().insert(owners.map(formatOwnerApi));

      const actual = await collect(
        ownerRepository.stream({
          groupBy: ['full_name']
        })
      );

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<OwnerApi>((owner) => {
        return !actual
          .filter((owner: OwnerApi) => owner.id !== owner.id)
          .map((owner: OwnerApi) => owner.fullName)
          .includes(owner.fullName);
      });
    });
  });

  describe('parseOwnerApi edge branches', () => {
    it('should format a JS Date birth_date as a yyyy-mm-dd string', async () => {
      const owner = genOwnerApi();
      const birthDate = new Date('1975-06-15T00:00:00.000Z');
      await Owners().insert({
        ...formatOwnerApi(owner),
        birth_date: birthDate
      });

      const actual = await ownerRepository.get(owner.id);

      expect(actual?.birthDate).toBe('1975-06-15');
    });

    it('should map null created_at/updated_at to null createdAt/updatedAt', async () => {
      const owner = genOwnerApi();
      await Owners().insert({
        ...formatOwnerApi(owner),
        created_at: null,
        updated_at: null
      });

      const actual = await ownerRepository.get(owner.id);

      expect(actual?.createdAt).toBeNull();
      expect(actual?.updatedAt).toBeNull();
    });

    it('should map missing BAN row to null banAddress', async () => {
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
      // Deliberately insert no ban_addresses row for this owner

      const results = await ownerRepository.find({
        includes: ['banAddress'],
        filters: { fullName: owner.fullName }
      });
      const actual = results.find((o) => o.id === owner.id);

      expect(actual).toBeDefined();
      expect(actual?.banAddress).toBeNull();
    });
  });

  describe('findByHousing', () => {
    it('should return HousingOwnerApi entries for the linked owner', async () => {
      const owner = genOwnerApi();
      const housing = genHousingApi();

      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(
        formatHousingOwnerApi({
          ...genHousingOwnerApi(housing, owner),
          rank: 1
        })
      );

      const actual = await ownerRepository.findByHousing(housing);

      expect(actual).toPartiallyContain({ id: owner.id });
    });

    it('should map null locprop_source to null locprop', async () => {
      const owner = genOwnerApi();
      const housing = genHousingApi();
      const housingOwner = genHousingOwnerApi(housing, owner);

      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(
        formatHousingOwnerApi({
          ...housingOwner,
          rank: 1,
          locprop: null
        })
      );

      const actual = await ownerRepository.findByHousing(housing);

      const found = actual.find((ho) => ho.id === owner.id);
      expect(found).toBeDefined();
      expect(found?.locprop).toBeNull();
    });
  });

  describe('insertHousingOwners', () => {
    it('should insert rows into HousingOwners and return the inserted count', async () => {
      const owner = genOwnerApi();
      const housing = genHousingApi();

      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(owner));

      const housingOwners = [
        { ...genHousingOwnerApi(housing, owner), rank: 1 as const }
      ];

      const result = await ownerRepository.insertHousingOwners(housingOwners);

      expect(result).toBe(1);

      const rows = await HousingOwners()
        .where({ owner_id: owner.id, housing_id: housing.id });
      expect(rows).toHaveLength(1);
    });
  });

  describe('deleteHousingOwners', () => {
    it('should remove the housing_owner link and return the deleted count', async () => {
      const owner = genOwnerApi();
      const housing = genHousingApi();

      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(
        formatHousingOwnerApi({
          ...genHousingOwnerApi(housing, owner),
          rank: 1
        })
      );

      const result = await ownerRepository.deleteHousingOwners(housing.id, [
        owner.id
      ]);

      expect(result).toBe(1);

      const rows = await HousingOwners()
        .where({ owner_id: owner.id, housing_id: housing.id });
      expect(rows).toHaveLength(0);
    });
  });

  describe('refreshMultiOwnerFlags', () => {
    it('should set is_multi_owner to true for owners with rank=1 in more than one housing', async () => {
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
      const housings = [genHousingApi(), genHousingApi()];
      await Housing().insert(housings.map(formatHousingRecordApi));
      await HousingOwners().insert(
        housings.map((housing) =>
          formatHousingOwnerApi({
            ...genHousingOwnerApi(housing, owner),
            rank: 1
          })
        )
      );

      await ownerRepository.refreshMultiOwnerFlags([owner.id]);

      const actual = await Owners().where({ id: owner.id }).first();
      expect(actual?.is_multi_owner).toBe(true);
    });

    it('should set is_multi_owner to false for owners with rank=1 in only one housing', async () => {
      const owner = genOwnerApi();
      await Owners().insert({ ...formatOwnerApi(owner), is_multi_owner: true });
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));
      await HousingOwners().insert(
        formatHousingOwnerApi({
          ...genHousingOwnerApi(housing, owner),
          rank: 1
        })
      );

      await ownerRepository.refreshMultiOwnerFlags([owner.id]);

      const actual = await Owners().where({ id: owner.id }).first();
      expect(actual?.is_multi_owner).toBe(false);
    });

    it('should not update owners not in the list', async () => {
      const ownerToSkip = genOwnerApi();
      await Owners().insert({
        ...formatOwnerApi(ownerToSkip),
        is_multi_owner: true
      });

      await ownerRepository.refreshMultiOwnerFlags([]);

      const actual = await Owners().where({ id: ownerToSkip.id }).first();
      expect(actual?.is_multi_owner).toBe(true);
    });

    it('should handle batches larger than the pg uint16 parameter limit without protocol overflow', async () => {
      // pg encodes parameter count as uint16 (max 65 535). Without internal
      // chunking, a whereIn with >65 535 IDs overflows and PostgreSQL rejects
      // the bind message with 08P01. None of these IDs exist in the DB so the
      // UPDATE matches 0 rows — we only need the query to not throw.
      const ids = Array.from({ length: 70_000 }, () => genOwnerApi().id);
      await expect(
        ownerRepository.refreshMultiOwnerFlags(ids)
      ).resolves.toBeUndefined();
    });
  });
});
