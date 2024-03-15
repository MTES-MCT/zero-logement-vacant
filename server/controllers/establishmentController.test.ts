import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';

import { createServer } from '../server';
import { EstablishmentApi } from '../models/EstablishmentApi';
import { genEstablishmentApi, oneOf } from '../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi,
} from '../repositories/establishmentRepository';

describe('Establishment API', () => {
  const { app } = createServer();

  describe('GET /establishments', () => {
    const testRoute = (query = '') => `/api/establishments${query}`;

    const establishments: EstablishmentApi[] = Array.from({ length: 3 }).map(
      () => genEstablishmentApi()
    );

    beforeAll(async () => {
      await Establishments().insert(establishments.map(formatEstablishmentApi));
    });

    it('should receive at least a query param', async () => {
      const { status } = await request(app).get(testRoute());

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should receive valid query params', async () => {
      await request(app)
        .get(testRoute(`?geoCodes=1232456789`))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .get(testRoute(`?available=available`))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return an empty array where no establishment is found', async () => {
      const { body, status } = await request(app).get(
        testRoute(`?query=${randomstring.generate()}`)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toEqual([]);
    });

    it('should list available establishments', async () => {
      const { body, status } = await request(app).get(
        testRoute('?available=true')
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toSatisfyAll<EstablishmentApi>((establishment) => {
        return establishment.available;
      });
    });

    it('should search by query', async () => {
      const [firstEstablishment] = establishments;

      const { body, status } = await request(app).get(
        testRoute(
          `?query=${firstEstablishment.name.substring(
            1,
            firstEstablishment.name.length - 1
          )}`
        )
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toPartiallyContain({
        id: firstEstablishment.id,
        name: firstEstablishment.name,
      });
    });

    it('should list by geo code', async () => {
      const [firstEstablishment] = establishments;

      const { body, status } = await request(app).get(
        testRoute(`?geoCodes=${oneOf(firstEstablishment.geoCodes)}`)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toPartiallyContain({
        id: firstEstablishment.id,
        name: firstEstablishment.name,
      });
    });
  });
});
