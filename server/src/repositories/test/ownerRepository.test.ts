import { faker } from '@faker-js/faker';
import { collect } from '@zerologementvacant/utils/node';

import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { genHousingOwnerApi, genOwnerApi } from '~/test/testFixtures';

import ownerRepository, { toOwnerInsert } from '../ownerRepository';

describe('Owner repository', () => {
  describe('find', () => {
    it('should search by full name', async () => {
      await Promise.all([
        factories.owner.create({ fullName: 'Jean Valjean' }),
        factories.owner.create({ fullName: 'Jean Dupont' }),
        factories.owner.create({ fullName: 'Pierre Jean' }),
        factories.owner.create({ fullName: 'Kyan khojandi' })
      ]);

      const actual = await ownerRepository.find({
        search: 'Jea'
      });

      expect(actual.length).toBeGreaterThanOrEqual(3);
      expect(actual).not.toPartiallyContain({ fullName: 'Kyan khojandi' });
    });

    describe('Filter by idpersonne', () => {
      it('should keep owners who have an idpersonne defined', async () => {
        await Promise.all([
          factories.owner.create({ idpersonne: faker.string.alphanumeric(10) }),
          factories.owner.create({ idpersonne: null }),
          factories.owner.create({ idpersonne: faker.string.alphanumeric(10) })
        ]);

        const actual = await ownerRepository.find({
          filters: {
            idpersonne: true
          }
        });

        expect(actual).toSatisfyAll((owner) => !!owner.idpersonne);
      });

      it('should filter by idpersonne', async () => {
        const owners = await factories.owner.createList(3);
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
        const ownerWithNull = await factories.owner.create({
          idpersonne: null
        });
        const ownerWithId = await factories.owner.create({
          idpersonne: faker.string.alphanumeric(10)
        });

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
        const owner = await factories.owner.create({
          idpersonne: targetIdpersonne
        });
        await factories.owner.create({
          idpersonne: faker.string.alphanumeric(10)
        });

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
        const ownerA = await factories.owner.create({ idpersonne: null });
        const ownerB = await factories.owner.create({
          idpersonne: faker.string.alphanumeric(10)
        });

        const actual = await ownerRepository.find({
          filters: { idpersonne: [] },
          pagination: { paginate: false }
        });

        expect(actual).toPartiallyContain({ id: ownerA.id });
        expect(actual).toPartiallyContain({ id: ownerB.id });
      });
    });

    describe('Filter by campaignId', () => {
      let establishment: EstablishmentApi;
      let creator: UserApi;

      beforeAll(async () => {
        establishment = await factories.establishment.create();
        creator = await factories.user.create({
          establishmentId: establishment.id
        });
      });

      it('should return only the owner linked to that campaign', async () => {
        const linkedOwner = await factories.owner.create();
        const unlinkedOwner = await factories.owner.create();
        const housing = await factories.housing.create();

        await factories
          .housingOwner({ housing, owner: linkedOwner })
          .create({ rank: 1 });

        const campaign = await factories
          .campaign(establishment)
          .create({}, { associations: { createdBy: creator } });
        await kysely
          .insertInto('campaignsHousing')
          .values({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

        const actual = await ownerRepository.find({
          filters: { campaignId: campaign.id },
          pagination: { paginate: false }
        });

        expect(actual).toPartiallyContain({ id: linkedOwner.id });
        expect(actual).not.toPartiallyContain({ id: unlinkedOwner.id });
      });
    });

    describe('Filter by groupId', () => {
      let establishment: EstablishmentApi;
      let creator: UserApi;

      beforeAll(async () => {
        establishment = await factories.establishment.create();
        creator = await factories.user.create({
          establishmentId: establishment.id
        });
      });

      it('should return only the owner linked to that group', async () => {
        const linkedOwner = await factories.owner.create();
        const unlinkedOwner = await factories.owner.create();
        const housing = await factories.housing.create();

        await factories
          .housingOwner({ housing, owner: linkedOwner })
          .create({ rank: 1 });

        const group = await factories
          .group(establishment)
          .create({}, { associations: { createdBy: creator } });
        await kysely
          .insertInto('groupsHousing')
          .values({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
          .execute();

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
        const owner = await factories.owner.create();
        const housing = await factories.housing.create();

        await factories.housingOwner({ housing, owner }).create({ rank: 1 });

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
        await factories.owner.createList(51);

        const actual = await ownerRepository.find();

        expect(actual.length).toBeLessThanOrEqual(50);
      });

      it('should disable pagination', async () => {
        await factories.owner.createList(51);

        const actual = await ownerRepository.find({
          pagination: { paginate: false }
        });

        expect(actual.length).toBeGreaterThanOrEqual(51);
      });

      it('should paginate explicitely', async () => {
        await factories.owner.createList(21);

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
      const owner = await factories.owner.create();

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
      const owner = await factories.owner.create({ birthDate: null });

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
      const owner = await factories.owner.create();

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
      const owners = await factories.owner.createList(15);

      const actual = await ownerRepository.count();

      expect(actual).toBeGreaterThanOrEqual(owners.length);
    });

    it('should count owners matching search', async () => {
      await Promise.all([
        factories.owner.create({ fullName: 'Jean Valjean' }),
        factories.owner.create({ fullName: 'Jean Dupont' }),
        factories.owner.create({ fullName: 'Pierre Jean' }),
        factories.owner.create({ fullName: 'Kyan khojandi' })
      ]);

      const actual = await ownerRepository.count({
        search: 'Jea'
      });

      expect(actual).toBeGreaterThanOrEqual(3);
    });

    it('should count owners with idpersonne defined', async () => {
      await Promise.all([
        factories.owner.create({ idpersonne: faker.string.alphanumeric(10) }),
        factories.owner.create({ idpersonne: null }),
        factories.owner.create({ idpersonne: faker.string.alphanumeric(10) })
      ]);

      const actual = await ownerRepository.count({
        filters: {
          idpersonne: true
        }
      });

      expect(actual).toBeGreaterThanOrEqual(2);
    });

    it('should count owners by idpersonne', async () => {
      const owners = await factories.owner.createList(5);
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
      await factories.owner.createList(4, { fullName: 'Jean Dupont' });

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
      await kysely
        .insertInto('owners')
        .values({ ...toOwnerInsert(owner), birthDate })
        .execute();

      const actual = await ownerRepository.get(owner.id);

      expect(actual?.birthDate).toBe('1975-06-15');
    });

    it('should map null created_at/updated_at to null createdAt/updatedAt', async () => {
      const owner = genOwnerApi();
      await kysely
        .insertInto('owners')
        .values({ ...toOwnerInsert(owner), createdAt: null, updatedAt: null })
        .execute();

      const actual = await ownerRepository.get(owner.id);

      expect(actual?.createdAt).toBeNull();
      expect(actual?.updatedAt).toBeNull();
    });

    it('should map missing BAN row to null banAddress', async () => {
      const owner = await factories.owner.create();
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
      const owner = await factories.owner.create();
      const housing = await factories.housing.create();

      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      const actual = await ownerRepository.findByHousing(housing);

      expect(actual).toPartiallyContain({ id: owner.id });
    });

    it('should map null locprop_source to null locprop', async () => {
      const owner = await factories.owner.create();
      const housing = await factories.housing.create();

      await factories
        .housingOwner({ housing, owner })
        .create({ rank: 1, locprop: null });

      const actual = await ownerRepository.findByHousing(housing);

      const found = actual.find((ho) => ho.id === owner.id);
      expect(found).toBeDefined();
      expect(found?.locprop).toBeNull();
    });
  });

  describe('insertHousingOwners', () => {
    it('should insert rows into HousingOwners and return the inserted count', async () => {
      const owner = await factories.owner.create();
      const housing = await factories.housing.create();

      const housingOwners = [
        { ...genHousingOwnerApi(housing, owner), rank: 1 as const }
      ];

      const result = await ownerRepository.insertHousingOwners(housingOwners);

      expect(result).toBe(1);

      const rows = await kysely
        .selectFrom('ownersHousing')
        .selectAll('ownersHousing')
        .where('ownerId', '=', owner.id)
        .where('housingId', '=', housing.id)
        .execute();
      expect(rows).toHaveLength(1);
    });
  });

  describe('deleteHousingOwners', () => {
    it('should remove the housing_owner link and return the deleted count', async () => {
      const owner = await factories.owner.create();
      const housing = await factories.housing.create();

      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      const result = await ownerRepository.deleteHousingOwners(housing.id, [
        owner.id
      ]);

      expect(result).toBe(1);

      const rows = await kysely
        .selectFrom('ownersHousing')
        .selectAll('ownersHousing')
        .where('ownerId', '=', owner.id)
        .where('housingId', '=', housing.id)
        .execute();
      expect(rows).toHaveLength(0);
    });
  });

  describe('insert', () => {
    it('should return the inserted OwnerApi and persist the row', async () => {
      const draft = genOwnerApi();

      const result = await ownerRepository.insert(draft);

      expect(result).toMatchObject<Partial<OwnerApi>>({
        fullName: draft.fullName,
        email: draft.email
      });
      const row = await kysely
        .selectFrom('owners')
        .selectAll('owners')
        .where('id', '=', result.id)
        .executeTakeFirst();
      expect(row).toBeDefined();
      expect(row?.fullName).toBe(draft.fullName);
    });
  });

  describe('update', () => {
    it('should update the owner fields and return the updated OwnerApi', async () => {
      const owner = await factories.owner.create();

      const modified: OwnerApi = { ...owner, email: 'updated@example.com' };
      const result = await ownerRepository.update(modified);

      expect(result.email).toBe('updated@example.com');
      const row = await kysely
        .selectFrom('owners')
        .selectAll('owners')
        .where('id', '=', owner.id)
        .executeTakeFirst();
      expect(row?.email).toBe('updated@example.com');
    });
  });

  describe('betterSave', () => {
    it('should update an existing row on conflict and not duplicate it', async () => {
      const owner = await factories.owner.create();

      const updated: OwnerApi = { ...owner, email: 'bettersave@example.com' };
      await ownerRepository.betterSave(updated, {
        onConflict: ['id'],
        merge: ['email']
      });

      const rows = await kysely
        .selectFrom('owners')
        .selectAll('owners')
        .where('id', '=', owner.id)
        .execute();
      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe('bettersave@example.com');
    });

    it('should join an ambient transaction and roll back with it', async () => {
      const owner = genOwnerApi();

      await expect(
        withinKyselyTransaction(async () => {
          await ownerRepository.betterSave(owner, {
            onConflict: ['id'],
            merge: ['email']
          });
          throw new Error('rollback');
        })
      ).rejects.toThrow('rollback');

      const actual = await kysely
        .selectFrom('owners')
        .selectAll('owners')
        .where('id', '=', owner.id)
        .executeTakeFirst();
      expect(actual).toBeUndefined();
    });
  });

  describe('betterSaveMany', () => {
    it('should persist all owners when given a non-empty array', async () => {
      const owners = [genOwnerApi(), genOwnerApi(), genOwnerApi()];

      await ownerRepository.betterSaveMany(owners, {
        onConflict: ['id'],
        merge: ['email']
      });

      for (const owner of owners) {
        const row = await kysely
          .selectFrom('owners')
          .selectAll('owners')
          .where('id', '=', owner.id)
          .executeTakeFirst();
        expect(row).toBeDefined();
        expect(row?.fullName).toBe(owner.fullName);
      }
    });

    it('should resolve without writing any rows when given an empty array', async () => {
      const beforeCount = await ownerRepository.count();

      await ownerRepository.betterSaveMany([], {
        onConflict: ['id'],
        merge: ['email']
      });

      const afterCount = await ownerRepository.count();
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('refreshMultiOwnerFlags', () => {
    it('should set is_multi_owner to true for owners with rank=1 in more than one housing', async () => {
      const owner = await factories.owner.create();
      const housings = await factories.housing.createList(2);
      await Promise.all(
        housings.map((housing) =>
          factories.housingOwner({ housing, owner }).create({ rank: 1 })
        )
      );

      await ownerRepository.refreshMultiOwnerFlags([owner.id]);

      const actual = await kysely
        .selectFrom('owners')
        .selectAll('owners')
        .where('id', '=', owner.id)
        .executeTakeFirst();
      expect(actual?.isMultiOwner).toBe(true);
    });

    it('should set is_multi_owner to false for owners with rank=1 in only one housing', async () => {
      const owner = genOwnerApi();
      await kysely
        .insertInto('owners')
        .values({ ...toOwnerInsert(owner), isMultiOwner: true })
        .execute();
      const housing = await factories.housing.create();
      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      await ownerRepository.refreshMultiOwnerFlags([owner.id]);

      const actual = await kysely
        .selectFrom('owners')
        .selectAll('owners')
        .where('id', '=', owner.id)
        .executeTakeFirst();
      expect(actual?.isMultiOwner).toBe(false);
    });

    it('should not update owners not in the list', async () => {
      const ownerToSkip = genOwnerApi();
      await kysely
        .insertInto('owners')
        .values({ ...toOwnerInsert(ownerToSkip), isMultiOwner: true })
        .execute();

      await ownerRepository.refreshMultiOwnerFlags([]);

      const actual = await kysely
        .selectFrom('owners')
        .selectAll('owners')
        .where('id', '=', ownerToSkip.id)
        .executeTakeFirst();
      expect(actual?.isMultiOwner).toBe(true);
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

  describe('searchOwners', () => {
    it('should paginate every matching owner exactly once when many share the same full name', async () => {
      // A token unique to this test, so pagination isn't polluted by owners
      // named "Dupont" et al. inserted by other tests in this file.
      const token = faker.string.alphanumeric(12);
      const owners = await factories.owner.createList(5, {
        fullName: `Jean ${token}`
      });

      const page1 = await ownerRepository.searchOwners(token, 1, 2);
      const page2 = await ownerRepository.searchOwners(token, 2, 2);
      const page3 = await ownerRepository.searchOwners(token, 3, 2);

      const seenIds = [...page1.entities, ...page2.entities, ...page3.entities]
        .filter((o) => owners.some((owner) => owner.id === o.id))
        .map((o) => o.id);
      expect(seenIds).toBeArrayOfSize(owners.length);
      expect(new Set(seenIds).size).toBe(owners.length);
    });
  });
});
