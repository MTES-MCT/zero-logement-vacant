import { faker } from '@faker-js/faker/locale/fr';
import { constants } from 'http2';
import request from 'supertest';

import { Precision } from '@zerologementvacant/models';
import { createServer } from '~/infra/server';
import { tokenProvider } from '~/test/testUtils';
import {
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  HousingPrecisionDBO,
  HousingPrecisions,
  PrecisionDBO,
  Precisions
} from '~/repositories/precisionRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { toPrecisionDTO } from '~/models/PrecisionApi';
import { HousingApi } from '~/models/HousingApi';

describe('Precision API', () => {
  const { app } = createServer();
  const establishment = genEstablishmentApi('01337');
  const anotherEstablishment = genEstablishmentApi('42000');
  const user = genUserApi(establishment.id);
  const anotherUser = genUserApi(anotherEstablishment.id);

  let precisions: ReadonlyArray<PrecisionDBO>;

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
    precisions = await Precisions().select();
  });

  describe('GET /precisions', () => {
    const testRoute = '/api/precisions';

    it('should be forbidden for non-authenticated users', async () => {
      const { status } = await request(app).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return the referential of precisions', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const precisions = await Precisions()
        .select()
        .then((precisions) => precisions.map(toPrecisionDTO));
      expect(body).toIncludeSameMembers(precisions);
    });
  });

  describe('GET /housing/:id/precisions', () => {
    const testRoute = (id: string) => `/api/housing/${id}/precisions`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );
    let housingPrecisions: PrecisionDBO[];

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      housingPrecisions = faker.helpers.arrayElements(precisions, 3);

      await HousingPrecisions().insert(
        housingPrecisions.map((precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id
        }))
      );
    });

    it('should be forbidden for non-authenticated users', async () => {
      const { status } = await request(app).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should check that the housing exists', async () => {
      const { status } = await request(app)
        .get(testRoute(faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should check that the housing is part of the authenticated user’s establishment', async () => {
      const { status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return housing precisions', async () => {
      const { body, status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toIncludeSameMembers(housingPrecisions.map(toPrecisionDTO));
    });
  });

  describe('PUT /housing/:id/precisions', () => {
    const testRoute = (id: string) => `/api/housing/${id}/precisions`;

    let housing: HousingApi;
    let payload: ReadonlyArray<Precision['id']>;

    beforeEach(async () => {
      housing = genHousingApi(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      await Housing().insert(formatHousingRecordApi(housing));
      payload = faker.helpers
        .arrayElements(precisions, { min: 1, max: 10 })
        .map((precision) => precision.id);
    });

    it('should be forbidden for non-authenticated users', async () => {
      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json');

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should check that the housing exists', async () => {
      const { status } = await request(app)
        .put(testRoute(faker.string.uuid()))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should check that the housing is part of the authenticated user’s establishment', async () => {
      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should write to the old fast_housing.deprecated_precisions', async () => {
      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actualHousing = await Housing()
        .where({
          geo_code: housing.geoCode,
          id: housing.id
        })
        .first();
      expect(actualHousing).toBeDefined();
      const oldPrecisions = (actualHousing?.deprecated_precisions ?? []).concat(
        actualHousing?.deprecated_vacancy_reasons ?? []
      );
      expect(oldPrecisions).toHaveLength(payload.length);
    });

    it('should link the housing to the precisions', async () => {
      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actualPrecisions = await HousingPrecisions().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actualPrecisions).toHaveLength(payload.length);
      expect(actualPrecisions).toSatisfyAll<HousingPrecisionDBO>(
        (actualPrecision) => {
          return payload.some(
            (precision) => precision === actualPrecision.precision_id
          );
        }
      );
    });

    it('should fully replace the housing precisions', async () => {
      const housingPrecisions: ReadonlyArray<HousingPrecisionDBO> =
        faker.helpers
          .arrayElements(precisions, { min: 1, max: 10 })
          .map((precision) => ({
            housing_geo_code: housing.geoCode,
            housing_id: housing.id,
            precision_id: precision.id
          }));
      await HousingPrecisions().insert(housingPrecisions);

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actualPrecisions = await HousingPrecisions().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actualPrecisions).toHaveLength(payload.length);
      expect(actualPrecisions).toSatisfyAll<HousingPrecisionDBO>(
        (actualPrecision) => {
          return payload.some(
            (precision) => precision === actualPrecision.precision_id
          );
        }
      );
    });

    it('should empty the housing precisions', async () => {
      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send([])
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actualPrecisions = await HousingPrecisions().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actualPrecisions).toHaveLength(0);
    });
  });
});
