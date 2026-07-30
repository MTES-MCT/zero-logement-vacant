import { faker } from '@faker-js/faker/locale/fr';

import { kysely } from '~/infra/database/kysely';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';

import establishmentRepository, {
  EstablishmentDBO,
  formatEstablishmentApi,
  parseEstablishmentApi
} from '../establishmentRepository';
import { toUserDBO } from '../userRepository';

describe('Establishment repository', () => {
  describe('find', () => {
    let establishments: EstablishmentApi[];

    beforeAll(async () => {
      establishments = await factories.establishment.createList(
        faker.number.int({ min: 3, max: 5 })
      );
    });

    it('should find all establishments when no filters provided', async () => {
      const actual = await establishmentRepository.find();

      const actualEstablishments = await kysely
        .selectFrom('establishments')
        .selectAll('establishments')
        .execute();
      expect(actual).toBeArrayOfSize(actualEstablishments.length);
    });

    it('should filter establishments by id', async () => {
      const slice = establishments.slice(0, 2);

      const actual = await establishmentRepository.find({
        filters: {
          id: slice.map((establishment) => establishment.id)
        }
      });

      expect(actual).toBeArrayOfSize(slice.length);
      expect(actual).toIncludeSameMembers(slice);
    });

    it('should filter establishments by available status', async () => {
      await factories.establishment.createList(2, { available: false });

      const actual = await establishmentRepository.find({
        filters: { available: false }
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<EstablishmentApi>(
        (establishment) => !establishment.available
      );
    });

    it('should filter establishments by siren', async () => {
      const sirenEstablishments = await factories.establishment.createList(
        faker.number.int({ min: 3, max: 5 })
      );

      const targetSirens = sirenEstablishments.slice(0, 2).map((e) => e.siren);
      const actual = await establishmentRepository.find({
        filters: { siren: targetSirens }
      });

      expect(actual).toBeArrayOfSize(2);
      expect(actual.every((e) => targetSirens.includes(e.siren))).toBe(true);
    });

    it('should filter establishments by geoCodes', async () => {
      await Promise.all([
        factories.establishment.create({ geoCodes: ['75001', '75002'] }),
        factories.establishment.create({ geoCodes: ['69001', '69002'] }),
        factories.establishment.create({ geoCodes: ['13001', '13002'] })
      ]);
      const targetGeoCodes = ['75001', '69001'];

      const actual = await establishmentRepository.find({
        filters: {
          geoCodes: targetGeoCodes
        }
      });

      expect(actual.length).toBeGreaterThanOrEqual(2);
      expect(actual).toSatisfyAll<EstablishmentApi>((establishment) => {
        return establishment.geoCodes.some((geoCode) =>
          targetGeoCodes.includes(geoCode)
        );
      });
    });

    it('should return empty array when no establishments match geoCodes', async () => {
      await factories.establishment.create({
        geoCodes: ['75001', '75002']
      });

      const actual = await establishmentRepository.find({
        filters: {
          geoCodes: ['99999']
        }
      });

      expect(actual).toBeArrayOfSize(0);
    });

    it('should filter establishments related to the given one', async () => {
      const [related] = await Promise.all([
        factories.establishment.create({ geoCodes: ['75001', '75002'] }),
        factories.establishment.create({ geoCodes: ['75002', '75003'] }),
        factories.establishment.create({ geoCodes: ['69001', '69002'] })
      ]);

      const actuals = await establishmentRepository.find({
        filters: {
          related: related.id
        }
      });

      expect(actuals.length).toBeGreaterThan(0);
      expect(actuals).toSatisfyAll<EstablishmentApi>((actual) => {
        return actual.geoCodes.some((geoCode) =>
          related.geoCodes.includes(geoCode)
        );
      });
    });

    it('should filter active establishments', async () => {
      const activeCandidates = await factories.establishment.createList(
        faker.number.int({ min: 1, max: 5 })
      );
      await Promise.all(
        activeCandidates.map((establishment) =>
          factories.user.createList(faker.number.int({ min: 1, max: 3 }), {
            establishmentId: establishment.id
          })
        )
      );

      const actual = await establishmentRepository.find({
        filters: {
          active: true
        },
        includes: ['users']
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<EstablishmentApi>(
        (establishment) =>
          establishment.users !== undefined && establishment.users.length > 0
      );
    });

    it('should include users when requested', async () => {
      const establishment = await factories.establishment.create();
      const users = await factories.user.createList(
        faker.number.int({ min: 2, max: 4 }),
        { establishmentId: establishment.id }
      );

      const actual = await establishmentRepository.find({
        filters: { id: [establishment.id] },
        includes: ['users']
      });

      expect(actual).toBeArrayOfSize(1);
      expect(actual[0].users).toBeDefined();
      expect(actual[0].users).toBeArrayOfSize(users.length);
      expect(
        actual[0].users?.every((u) => users.some((user) => user.id === u.id))
      ).toBe(true);
    });

    it('should not include users when not requested', async () => {
      const establishment = await factories.establishment.create();
      await factories.user.create({ establishmentId: establishment.id });

      const actual = await establishmentRepository.find({
        filters: { id: [establishment.id] }
      });

      expect(actual).toBeArrayOfSize(1);
      expect(actual[0].users).toBeUndefined();
    });

    it('should filter establishments by kind', async () => {
      await factories.establishment.create({ kind: 'COM' });

      const actual = await establishmentRepository.find({
        filters: { kind: ['COM'] }
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<EstablishmentApi>((e) => e.kind === 'COM');
    });

    it('should filter establishments by query (accent- and case-insensitive)', async () => {
      const establishment = await factories.establishment.create({
        name: 'Métropole Étoile'
      });

      const actual = await establishmentRepository.find({
        filters: { query: 'metropole etoile' }
      });

      const ids = actual.map((e) => e.id);
      expect(ids).toContain(establishment.id);
    });

    it('should return no establishments when query does not match', async () => {
      const establishment = await factories.establishment.create();

      const actual = await establishmentRepository.find({
        filters: { query: 'zzzzzznonexistentzzzzzz' }
      });

      const ids = actual.map((e) => e.id);
      expect(ids).not.toContain(establishment.id);
    });

    it('should filter establishments by normalized name', async () => {
      const establishment = await factories.establishment.create({
        name: "Communauté d'Agglomération de Test (CAT)"
      });

      // The `name` filter normalizes the stored name by dropping apostrophes
      // and any parenthetical suffix, replacing spaces/hyphens with a single
      // hyphen, lowercasing and unaccenting it, then does a trailing LIKE —
      // so the query value must already be normalized the same way.
      const actual = await establishmentRepository.find({
        filters: { name: 'communaute-dagglomeration-de-test' }
      });

      const ids = actual.map((e) => e.id);
      expect(ids).toContain(establishment.id);
    });

    it('should return no establishments when name does not match', async () => {
      const establishment = await factories.establishment.create();

      const actual = await establishmentRepository.find({
        filters: { name: 'zzzzzznonexistentzzzzzz' }
      });

      const ids = actual.map((e) => e.id);
      expect(ids).not.toContain(establishment.id);
    });
  });

  describe('stream', () => {
    it('should stream all establishments as a web ReadableStream', async () => {
      const establishment = await factories.establishment.create();

      const results: EstablishmentApi[] = [];
      const reader = establishmentRepository.stream().getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      const ids = results.map((e) => e.id);
      expect(ids).toContain(establishment.id);
    });

    it('should only stream establishments updated after the given date', async () => {
      const establishment = await factories.establishment.create();
      const cutoff = new Date(Date.now() + 1000 * 60 * 60);

      const results: EstablishmentApi[] = [];
      const reader = establishmentRepository
        .stream({ updatedAfter: cutoff })
        .getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        results.push(value);
      }

      const ids = results.map((e) => e.id);
      expect(ids).not.toContain(establishment.id);
    });
  });

  describe('get', () => {
    let establishment: EstablishmentApi;
    let users: UserApi[];

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      users = await factories.user.createList(
        faker.number.int({ min: 1, max: 3 }),
        { establishmentId: establishment.id }
      );
    });

    it('should get establishment by id', async () => {
      const actual = await establishmentRepository.get(establishment.id);

      expect(actual).toMatchObject<Partial<EstablishmentApi>>({
        id: establishment.id,
        name: establishment.name,
        siren: establishment.siren,
        available: establishment.available
      });
    });

    it('should return null when the establishment is missing', async () => {
      const actual = await establishmentRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });

    it('should include users when requested', async () => {
      const actual = await establishmentRepository.get(establishment.id, {
        includes: ['users']
      });

      expect(actual).toBeDefined();
      expect(actual!.users).toBeDefined();
      expect(actual!.users).toBeArrayOfSize(users.length);
    });

    it('should not include deleted users', async () => {
      await factories.user.create({
        establishmentId: establishment.id,
        deletedAt: new Date().toJSON()
      });

      const actual = await establishmentRepository.get(establishment.id, {
        includes: ['users']
      });

      expect(actual!.users!.length).toBeGreaterThan(0);
      expect(actual!.users).toSatisfyAll<UserApi>(
        (user) => user.deletedAt === null
      );
    });
  });

  describe('findOne', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({
        establishmentId: establishment.id
      });
    });

    it('should find establishment by siren', async () => {
      const actual = await establishmentRepository.findOne({
        siren: Number(establishment.siren)
      });

      expect(actual).toMatchObject<Partial<EstablishmentApi>>({
        id: establishment.id,
        siren: establishment.siren
      });
    });

    it('should return null when establishment not found by siren', async () => {
      const actual = await establishmentRepository.findOne({
        siren: 123456789
      });

      expect(actual).toBeNull();
    });

    it('should include users when requested', async () => {
      const actual = await establishmentRepository.findOne({
        siren: Number(establishment.siren),
        includes: ['users']
      });

      expect(actual).toBeDefined();
      expect(actual!.users).toBeDefined();
      expect(actual!.users).toBeArrayOfSize(1);
      expect(actual!.users![0].id).toBe(user.id);
    });

    it('should find an unfiltered establishment when siren is not provided', async () => {
      const actual = await establishmentRepository.findOne({});

      expect(actual).not.toBeNull();
    });
  });

  describe('update', () => {
    let establishment: EstablishmentApi;

    beforeEach(async () => {
      establishment = await factories.establishment.create();
    });

    it('should update establishment', async () => {
      const updated = { ...establishment, name: 'Updated Name' };

      await establishmentRepository.update(updated);

      const actual = await kysely
        .selectFrom('establishments')
        .selectAll('establishments')
        .where('id', '=', establishment.id)
        .executeTakeFirst();

      expect(actual?.name).toBe(updated.name);
    });
  });

  describe('setAvailable', () => {
    let establishment: EstablishmentApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create({
        available: false
      });
    });

    it('should set establishment as available', async () => {
      await establishmentRepository.setAvailable(establishment);

      const actual = await kysely
        .selectFrom('establishments')
        .selectAll('establishments')
        .where('id', '=', establishment.id)
        .executeTakeFirst();

      expect(actual?.available).toBe(true);
    });
  });

  describe('save', () => {
    it('should create a new establishment', async () => {
      const establishment = genEstablishmentApi();
      const establishmentDBO = formatEstablishmentApi(establishment);

      await establishmentRepository.save(establishmentDBO);

      const actual = await kysely
        .selectFrom('establishments')
        .selectAll('establishments')
        .where('id', '=', establishment.id)
        .executeTakeFirst();
      expect(actual).toBeDefined();
      expect(actual?.name).toBe(establishment.name);
      expect(actual?.siren).toBe(Number(establishment.siren));
    });
  });

  describe('formatEstablishmentApi', () => {
    it('should format establishment API to DBO', async () => {
      const establishment = genEstablishmentApi();

      const actual = formatEstablishmentApi(establishment);

      expect(actual).toMatchObject<Partial<EstablishmentDBO>>({
        id: establishment.id,
        name: establishment.name,
        siren: Number(establishment.siren),
        available: establishment.available,
        localities_geo_code: establishment.geoCodes,
        kind: establishment.kind,
        source: establishment.source
      });
    });
  });

  describe('parseEstablishmentApi', () => {
    it('should parse establishment DBO to API', async () => {
      const establishment = genEstablishmentApi();
      const dbo = formatEstablishmentApi(establishment);

      const actual = parseEstablishmentApi(dbo);

      expect(actual).toMatchObject({
        id: establishment.id,
        name: establishment.name,
        shortName: establishment.shortName,
        siren: establishment.siren,
        available: establishment.available,
        geoCodes: establishment.geoCodes,
        kind: establishment.kind,
        source: establishment.source
      });
    });

    it('should parse users when present', async () => {
      const establishment = genEstablishmentApi();
      const user = genUserApi(establishment.id);
      const dbo = {
        ...formatEstablishmentApi(establishment),
        users: [toUserDBO(user)]
      };

      const api = parseEstablishmentApi(dbo);

      expect(api.users).toBeDefined();
      expect(api.users).toBeArrayOfSize(1);
      expect(api.users![0].id).toBe(user.id);
    });

    it('should set shortName to name', async () => {
      const establishment = {
        ...genEstablishmentApi(),
        name: 'Commune de Paris'
      };
      const dbo = formatEstablishmentApi(establishment);
      const api = parseEstablishmentApi(dbo);

      expect(api.shortName).toBe('Commune de Paris');
    });
  });
});
