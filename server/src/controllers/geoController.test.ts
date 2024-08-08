import { faker } from '@faker-js/faker/locale/fr';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';

import { tokenProvider } from '~/test/testUtils';
import {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '~/repositories/geoRepository';
import { createServer } from '~/infra/server';
import {
  genEstablishmentApi,
  genGeoPerimeterApi,
  genUserApi
} from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';

describe('Geo perimeters API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const anotherEstablishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(formatUserApi(user));
  });

  describe('GET /geo/perimeters', () => {
    const testRoute = '/api/geo/perimeters';

    const geoPerimeters: GeoPerimeterApi[] = Array.from({ length: 3 }, () =>
      genGeoPerimeterApi(establishment.id)
    );
    const otherGeoPerimeters: GeoPerimeterApi[] = Array.from(
      { length: 2 },
      () => genGeoPerimeterApi(anotherEstablishment.id)
    );

    beforeAll(async () => {
      await GeoPerimeters().insert(
        geoPerimeters.concat(otherGeoPerimeters).map(formatGeoPerimeterApi)
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list the geo perimeters for the authenticated user', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const ids = new Set(
        body.map((perimeter: GeoPerimeterApi) => perimeter.id)
      );
      expect(geoPerimeters).toSatisfyAll<GeoPerimeterApi>((perimeter) =>
        ids.has(perimeter.id)
      );
      expect(otherGeoPerimeters).toSatisfyAll<GeoPerimeterApi>(
        (perimeter) => !ids.has(perimeter.id)
      );
    });
  });

  describe('DELETE /geo/perimeters', () => {
    const testRoute = '/api/geo/perimeters';

    const geoPerimeter = genGeoPerimeterApi(establishment.id);

    beforeAll(async () => {
      await GeoPerimeters().insert(formatGeoPerimeterApi(geoPerimeter));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app)
        .delete(testRoute)
        .send({ geoPerimeterIds: [geoPerimeter.id] });

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received valid geo perimeter ids array', async () => {
      await request(app)
        .delete(testRoute)
        .send()
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
      await request(app)
        .delete(testRoute)
        .send({ geoPerimeterIds: geoPerimeter.id })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
      await request(app)
        .delete(testRoute)
        .send({
          geoPerimeterIds: [geoPerimeter.id, randomstring.generate()]
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should delete the perimeters', async () => {
      const { status } = await request(app)
        .delete(testRoute)
        .send({ geoPerimeterIds: [geoPerimeter.id] })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const actual = await GeoPerimeters()
        .where({ id: geoPerimeter.id })
        .first();
      expect(actual).toBeUndefined();
    });

    it('should not delete a perimeter from another establishment', async () => {
      const anotherGeoPerimeter = genGeoPerimeterApi(anotherEstablishment.id);
      await GeoPerimeters().insert(formatGeoPerimeterApi(anotherGeoPerimeter));

      const { status } = await request(app)
        .delete(testRoute)
        .send({ geoPerimeterIds: [anotherGeoPerimeter.id] })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const actual = await GeoPerimeters()
        .where({ id: anotherGeoPerimeter.id })
        .first();
      expect(actual).toMatchObject({
        id: anotherGeoPerimeter.id
      });
    });
  });

  describe('PUT /geo/perimeters/{id}', () => {
    const testRoute = (id: string) => `/api/geo/perimeters/${id}`;

    const geoPerimeter = genGeoPerimeterApi(establishment.id);
    const anotherGeoPerimeter = genGeoPerimeterApi(anotherEstablishment.id);

    beforeAll(async () => {
      await GeoPerimeters().insert(
        [geoPerimeter, anotherGeoPerimeter].map(formatGeoPerimeterApi)
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).put(testRoute(faker.string.uuid()));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a user from another establishment', async () => {
      const { status } = await request(app)
        .put(testRoute(anotherGeoPerimeter.id))
        .send({
          kind: randomstring.generate(),
          name: randomstring.generate()
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received valid parameters', async () => {
      await request(app)
        .put(testRoute('id'))
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(geoPerimeter.id))
        .send({
          name: randomstring.generate()
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should update the perimeter', async () => {
      const newKind: string = randomstring.generate();
      const newName: string = randomstring.generate();

      const { body, status } = await request(app)
        .put(testRoute(geoPerimeter.id))
        .send({
          kind: newKind,
          name: newName
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: geoPerimeter.id,
        kind: newKind,
        name: newName
      });

      const actual = await GeoPerimeters()
        .where({ id: geoPerimeter.id })
        .first();
      expect(actual).toMatchObject({
        id: geoPerimeter.id,
        kind: newKind,
        name: newName
      });
    });
  });
});
