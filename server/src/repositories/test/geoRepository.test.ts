import { faker } from '@faker-js/faker/locale/fr';

import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genGeoPerimeterApi,
  genUserApi
} from '~/test/testFixtures';

import perimeterRepository, {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '../geoRepository';

describe('Perimeter repository', () => {
  describe('find', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    const perimeters = faker.helpers.multiple(() =>
      genGeoPerimeterApi(establishment.id, user)
    );

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(toUserDBO(user));
      await GeoPerimeters().insert(perimeters.map(formatGeoPerimeterApi));
    });

    it('should filter by establishment', async () => {
      const anotherEstablishment = genEstablishmentApi();
      const anotherUser = genUserApi(anotherEstablishment.id);
      const perimeters = faker.helpers.multiple(() =>
        genGeoPerimeterApi(anotherEstablishment.id, user)
      );
      await Establishments().insert(
        formatEstablishmentApi(anotherEstablishment)
      );
      await Users().insert(toUserDBO(anotherUser));
      await GeoPerimeters().insert(perimeters.map(formatGeoPerimeterApi));

      const actual = await perimeterRepository.find(anotherEstablishment.id);

      expect(actual).toHaveLength(perimeters.length);
      expect(actual).toSatisfyAll<GeoPerimeterApi>((perimeter) => {
        return perimeter.establishmentId === anotherEstablishment.id;
      });
    });
  });

  describe('get', () => {
    it('should return the perimeter matching the id', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const perimeter = genGeoPerimeterApi(establishment.id, user);
      await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));

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
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const perimeter = genGeoPerimeterApi(establishment.id, user);

      await perimeterRepository.save(perimeter);

      const row = await GeoPerimeters().where({ id: perimeter.id }).first();
      expect(row).toBeDefined();
      expect(row?.name).toBe(perimeter.name);
    });

    it('should update geom/name/kind on conflict', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const perimeter = genGeoPerimeterApi(establishment.id, user);
      await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));

      await perimeterRepository.save({
        ...perimeter,
        name: 'Updated Name',
        kind: 'OPAH-RU'
      });

      const row = await GeoPerimeters().where({ id: perimeter.id }).first();
      expect(row?.name).toBe('Updated Name');
      expect(row?.kind).toBe('OPAH-RU');
    });
  });

  describe('update', () => {
    it('should update perimeter fields, excluding id/establishmentId/geometry', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const perimeter = genGeoPerimeterApi(establishment.id, user);
      await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));
      const before = await GeoPerimeters().where({ id: perimeter.id }).first();

      await perimeterRepository.update({
        ...perimeter,
        name: 'Updated Name',
        kind: 'OPAH-RU',
        geometry: genGeoPerimeterApi(establishment.id, user).geometry
      });

      const after = await GeoPerimeters().where({ id: perimeter.id }).first();
      expect(after?.name).toBe('Updated Name');
      expect(after?.kind).toBe('OPAH-RU');
      expect(after?.geom).toStrictEqual(before?.geom);
    });
  });

  describe('removeMany', () => {
    it('should remove perimeters matching both id and establishment', async () => {
      const establishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(establishment));
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const perimeters = faker.helpers.multiple(
        () => genGeoPerimeterApi(establishment.id, user),
        { count: 2 }
      );
      await GeoPerimeters().insert(perimeters.map(formatGeoPerimeterApi));

      await perimeterRepository.removeMany(
        perimeters.map((p) => p.id),
        establishment.id
      );

      const rows = await GeoPerimeters().whereIn(
        'id',
        perimeters.map((p) => p.id)
      );
      expect(rows).toBeArrayOfSize(0);
    });

    it('should not remove perimeters belonging to a different establishment', async () => {
      const establishment = genEstablishmentApi();
      const otherEstablishment = genEstablishmentApi();
      await Establishments().insert(
        [establishment, otherEstablishment].map(formatEstablishmentApi)
      );
      const user = genUserApi(establishment.id);
      await Users().insert(toUserDBO(user));
      const perimeter = genGeoPerimeterApi(establishment.id, user);
      await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));

      await perimeterRepository.removeMany(
        [perimeter.id],
        otherEstablishment.id
      );

      const row = await GeoPerimeters().where({ id: perimeter.id }).first();
      expect(row).toBeDefined();
    });
  });
});
