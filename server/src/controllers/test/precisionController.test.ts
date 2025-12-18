import { faker } from '@faker-js/faker/locale/fr';

import { Precision } from '@zerologementvacant/models';
import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '~/infra/server';
import { HousingApi } from '~/models/HousingApi';
import { toPrecisionDTO } from '~/models/PrecisionApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  Events,
  PRECISION_HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import {
  formatPrecisionHousingApi,
  HousingPrecisionDBO,
  HousingPrecisions,
  PrecisionDBO,
  Precisions
} from '~/repositories/precisionRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Precision API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });
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
      const { status } = await request(url).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return the referential of precisions', async () => {
      const { body, status } = await request(url)
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
      const { status } = await request(url).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should check that the housing exists', async () => {
      const { status } = await request(url)
        .get(testRoute(faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should check that the housing is part of the authenticated user’s establishment', async () => {
      const { status } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return housing precisions', async () => {
      const { body, status } = await request(url)
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
      const existingPrecisions = faker.helpers.arrayElements(precisions, 3);
      await HousingPrecisions().insert(
        existingPrecisions.map(formatPrecisionHousingApi(housing))
      );

      payload = faker.helpers
        .arrayElements(precisions, { min: 1, max: 10 })
        .map((precision) => precision.id);
    });

    it('should be forbidden for non-authenticated users', async () => {
      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json');

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should check that the housing exists', async () => {
      const { status } = await request(url)
        .put(testRoute(faker.string.uuid()))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should check that the housing is part of the authenticated user’s establishment', async () => {
      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should write to the old fast_housing.deprecated_precisions', async () => {
      const { status } = await request(url)
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
      const { status } = await request(url)
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
      const { status } = await request(url)
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
      const { status } = await request(url)
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

    it('should create an event when a precision is attached', async () => {
      const housingWithoutPrecisions = genHousingApi(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      await Housing().insert(formatHousingRecordApi(housingWithoutPrecisions));

      const { status } = await request(url)
        .put(testRoute(housingWithoutPrecisions.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(PRECISION_HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          type: 'housing:precision-attached',
          housing_geo_code: housingWithoutPrecisions.geoCode,
          housing_id: housingWithoutPrecisions.id
        });
      expect(events.length).toBeGreaterThan(0);
    });

    it('should create an event when a precision is detached', async () => {
      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send([])
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(PRECISION_HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          type: 'housing:precision-detached',
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        });
      expect(events.length).toBeGreaterThan(0);
    });
  });
});
