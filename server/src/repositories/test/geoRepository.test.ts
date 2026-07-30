import { faker } from '@faker-js/faker/locale/fr';

import { kysely } from '~/infra/database/kysely';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { genGeoPerimeterApi } from '~/test/testFixtures';

import perimeterRepository, { toGeoPerimeterInsert } from '../geoRepository';

describe('Perimeter repository', () => {
  describe('find', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;
    let perimeters: ReadonlyArray<GeoPerimeterApi>;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({
        establishmentId: establishment.id
      });
      perimeters = faker.helpers.multiple(() =>
        genGeoPerimeterApi(establishment.id, user)
      );
      await kysely
        .insertInto('geoPerimeters')
        .values(perimeters.map(toGeoPerimeterInsert))
        .execute();
    });

    it('should filter by establishment', async () => {
      const anotherEstablishment = await factories.establishment.create();
      const perimeters = faker.helpers.multiple(() =>
        genGeoPerimeterApi(anotherEstablishment.id, user)
      );
      await kysely
        .insertInto('geoPerimeters')
        .values(perimeters.map(toGeoPerimeterInsert))
        .execute();

      const actual = await perimeterRepository.find(anotherEstablishment.id);

      expect(actual).toHaveLength(perimeters.length);
      expect(actual).toSatisfyAll<GeoPerimeterApi>((perimeter) => {
        return perimeter.establishmentId === anotherEstablishment.id;
      });
    });
  });

  describe('get', () => {
    it('should return the perimeter matching the id', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const perimeter = genGeoPerimeterApi(establishment.id, user);
      await kysely
        .insertInto('geoPerimeters')
        .values(toGeoPerimeterInsert(perimeter))
        .execute();

      const actual = await perimeterRepository.get(perimeter.id);

      expect(actual).toMatchObject({
        id: perimeter.id,
        establishmentId: perimeter.establishmentId,
        name: perimeter.name,
        kind: perimeter.kind
      });
      // Known pre-existing bug, not fixed by this migration: unlike find(),
      // get() never applies st_asgeojson(geom)::jsonb, so `geometry` comes
      // back as a raw PostGIS (EWKB hex) string, not a valid GeoJSON
      // MultiPolygon, despite the declared type. Verified empirically
      // against the real DB before writing this assertion.
      expect(typeof actual?.geometry).toBe('string');
    });

    it('should return null if no perimeter matches the id', async () => {
      const actual = await perimeterRepository.get(faker.string.uuid());

      expect(actual).toBeNull();
    });
  });

  describe('save', () => {
    it('should insert a new perimeter', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const perimeter = genGeoPerimeterApi(establishment.id, user);

      await perimeterRepository.save(perimeter);

      const row = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where('id', '=', perimeter.id)
        .executeTakeFirst();
      expect(row).toBeDefined();
      expect(row?.name).toBe(perimeter.name);
    });

    it('should update geom/name/kind on conflict', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const perimeter = genGeoPerimeterApi(establishment.id, user);
      await kysely
        .insertInto('geoPerimeters')
        .values(toGeoPerimeterInsert(perimeter))
        .execute();

      await perimeterRepository.save({
        ...perimeter,
        name: 'Updated Name',
        kind: 'OPAH-RU'
      });

      const row = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where('id', '=', perimeter.id)
        .executeTakeFirst();
      expect(row?.name).toBe('Updated Name');
      expect(row?.kind).toBe('OPAH-RU');
    });
  });

  describe('update', () => {
    it('should update perimeter fields, excluding id/establishmentId/geometry', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const perimeter = genGeoPerimeterApi(establishment.id, user);
      await kysely
        .insertInto('geoPerimeters')
        .values(toGeoPerimeterInsert(perimeter))
        .execute();
      const before = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where('id', '=', perimeter.id)
        .executeTakeFirst();

      await perimeterRepository.update({
        ...perimeter,
        name: 'Updated Name',
        kind: 'OPAH-RU',
        geometry: genGeoPerimeterApi(establishment.id, user).geometry
      });

      const after = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where('id', '=', perimeter.id)
        .executeTakeFirst();
      expect(after?.name).toBe('Updated Name');
      expect(after?.kind).toBe('OPAH-RU');
      expect(after?.geom).toStrictEqual(before?.geom);
    });
  });

  describe('removeMany', () => {
    it('should remove perimeters matching both id and establishment', async () => {
      const establishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const perimeters = faker.helpers.multiple(
        () => genGeoPerimeterApi(establishment.id, user),
        { count: 2 }
      );
      await kysely
        .insertInto('geoPerimeters')
        .values(perimeters.map(toGeoPerimeterInsert))
        .execute();

      await perimeterRepository.removeMany(
        perimeters.map((p) => p.id),
        establishment.id
      );

      const rows = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where(
          'id',
          'in',
          perimeters.map((p) => p.id)
        )
        .execute();
      expect(rows).toBeArrayOfSize(0);
    });

    it('should not remove perimeters belonging to a different establishment', async () => {
      const establishment = await factories.establishment.create();
      const otherEstablishment = await factories.establishment.create();
      const user = await factories.user.create({
        establishmentId: establishment.id
      });
      const perimeter = genGeoPerimeterApi(establishment.id, user);
      await kysely
        .insertInto('geoPerimeters')
        .values(toGeoPerimeterInsert(perimeter))
        .execute();

      await perimeterRepository.removeMany(
        [perimeter.id],
        otherEstablishment.id
      );

      const row = await kysely
        .selectFrom('geoPerimeters')
        .selectAll('geoPerimeters')
        .where('id', '=', perimeter.id)
        .executeTakeFirst();
      expect(row).toBeDefined();
    });
  });
});
