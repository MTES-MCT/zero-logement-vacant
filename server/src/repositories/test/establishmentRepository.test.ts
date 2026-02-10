import { faker } from '@faker-js/faker/locale/fr';

import { EstablishmentApi } from '~/models/EstablishmentApi';
import { UserApi } from '~/models/UserApi';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';
import establishmentRepository, {
  EstablishmentDBO,
  Establishments,
  formatEstablishmentApi,
  parseEstablishmentApi
} from '../establishmentRepository';
import { Users, formatUserApi } from '../userRepository';

describe('Establishment repository', () => {
  describe('find', () => {
    const establishments = faker.helpers.multiple(() => genEstablishmentApi(), {
      count: { min: 3, max: 5 }
    });

    beforeAll(async () => {
      await Establishments().insert(establishments.map(formatEstablishmentApi));
    });

    it('should find all establishments when no filters provided', async () => {
      const actual = await establishmentRepository.find();

      const actualEstablishments = await Establishments().select();
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
      const unavailableEstablishments = faker.helpers.multiple(
        () => ({ ...genEstablishmentApi(), available: false }),
        { count: 2 }
      );
      await Establishments().insert(
        unavailableEstablishments.map(formatEstablishmentApi)
      );

      const actual = await establishmentRepository.find({
        filters: { available: false }
      });

      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<EstablishmentApi>(
        (establishment) => !establishment.available
      );
    });

    it('should filter establishments by siren', async () => {
      const establishments = faker.helpers.multiple(
        () => genEstablishmentApi(),
        {
          count: { min: 3, max: 5 }
        }
      );
      await Establishments().insert(establishments.map(formatEstablishmentApi));

      const targetSirens = establishments.slice(0, 2).map((e) => e.siren);
      const actual = await establishmentRepository.find({
        filters: { siren: targetSirens }
      });

      expect(actual).toBeArrayOfSize(2);
      expect(actual.every((e) => targetSirens.includes(e.siren))).toBe(true);
    });

    it('should filter establishments by geoCodes', async () => {
      const establishmentsWithGeoCodes = [
        { ...genEstablishmentApi(), geoCodes: ['75001', '75002'] },
        { ...genEstablishmentApi(), geoCodes: ['69001', '69002'] },
        { ...genEstablishmentApi(), geoCodes: ['13001', '13002'] }
      ];
      await Establishments().insert(
        establishmentsWithGeoCodes.map(formatEstablishmentApi)
      );
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
      const establishment = {
        ...genEstablishmentApi(),
        geoCodes: ['75001', '75002']
      };
      await Establishments().insert(formatEstablishmentApi(establishment));

      const actual = await establishmentRepository.find({
        filters: {
          geoCodes: ['99999']
        }
      });

      expect(actual).toBeArrayOfSize(0);
    });

    it('should filter establishments related to the given one', async () => {
      const establishments: ReadonlyArray<EstablishmentApi> = [
        genEstablishmentApi('75001', '75002'),
        genEstablishmentApi('75002', '75003'),
        genEstablishmentApi('69001', '69002')
      ];
      await Establishments().insert(establishments.map(formatEstablishmentApi));
      const related = establishments[0];

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
      const establishments = faker.helpers.multiple(() =>
        genEstablishmentApi()
      );
      const users = establishments
        .map((establishment) =>
          faker.helpers.multiple(() => genUserApi(establishment.id))
        )
        .flat();
      await Establishments().insert(establishments.map(formatEstablishmentApi));
      await Users().insert(users.map(formatUserApi));

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
      const establishment = genEstablishmentApi();
      const users = faker.helpers.multiple(() => genUserApi(establishment.id), {
        count: { min: 2, max: 4 }
      });

      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(users.map(formatUserApi));

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
      const establishment = genEstablishmentApi();
      const user = genUserApi(establishment.id);

      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));

      const actual = await establishmentRepository.find({
        filters: { id: [establishment.id] }
      });

      expect(actual).toBeArrayOfSize(1);
      expect(actual[0].users).toBeUndefined();
    });
  });

  describe('get', () => {
    const establishment = genEstablishmentApi();
    const users = faker.helpers.multiple(() => genUserApi(establishment.id), {
      count: { min: 1, max: 3 }
    });

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(users.map(formatUserApi));
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
      const deletedUser = {
        ...genUserApi(establishment.id),
        deletedAt: new Date().toJSON()
      };
      await Users().insert(formatUserApi(deletedUser));

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
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
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
  });

  describe('update', () => {
    const establishment = genEstablishmentApi();

    beforeEach(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
    });

    it('should update establishment', async () => {
      const updated = { ...establishment, name: 'Updated Name' };

      await establishmentRepository.update(updated);

      const actual = await establishmentRepository.get(establishment.id);

      expect(actual!.name).toBe(updated.name);
    });
  });

  describe('setAvailable', () => {
    const establishment = { ...genEstablishmentApi(), available: false };

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
    });

    it('should set establishment as available', async () => {
      await establishmentRepository.setAvailable(establishment);

      const actual = await establishmentRepository.get(establishment.id);

      expect(actual!.available).toBe(true);
    });
  });

  describe('save', () => {
    it('should create a new establishment', async () => {
      const establishment = genEstablishmentApi();
      const establishmentDBO = formatEstablishmentApi(establishment);

      await establishmentRepository.save(establishmentDBO);

      const actual = await establishmentRepository.get(establishment.id);
      expect(actual).toMatchObject<Partial<EstablishmentApi>>({
        id: establishment.id,
        name: establishment.name,
        siren: establishment.siren
      });
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
        users: [formatUserApi(user)]
      };

      const api = parseEstablishmentApi(dbo);

      expect(api.users).toBeDefined();
      expect(api.users).toBeArrayOfSize(1);
      expect(api.users![0].id).toBe(user.id);
    });

    it('should handle shortName for Commune establishments', async () => {
      const establishment = {
        ...genEstablishmentApi(),
        name: 'Commune de Paris',
        kind: 'COM' as const
      };
      const dbo = formatEstablishmentApi(establishment);
      const api = parseEstablishmentApi(dbo);

      expect(api.shortName).toBe('Paris');
    });
  });
});
