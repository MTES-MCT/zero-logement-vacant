import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import { Precision } from '@zerologementvacant/models';
import type { Selectable } from 'kysely';
import request from 'supertest';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { toPrecisionDTO } from '~/models/PrecisionApi';
import { UserApi } from '~/models/UserApi';
import { PrecisionDBO } from '~/repositories/precisionRepository';
import { factories } from '~/test/factories';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Precision API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let user: UserApi;
  // Not persisted: only used to mint a token for a user outside `establishment`.
  const anotherEstablishment = genEstablishmentApi('42000');
  const anotherUser = genUserApi(anotherEstablishment.id);

  let precisions: ReadonlyArray<PrecisionDBO>;

  beforeAll(async () => {
    // Scope the establishment to a fixed, partition-valid geo code so every
    // housing created below can be persisted and stays visible to the user.
    establishment = await factories.establishment.create({
      geoCodes: ['01337']
    });
    user = await factories.user.create({ establishmentId: establishment.id });
    precisions = (await kysely
      .selectFrom('precisions')
      .selectAll('precisions')
      .execute()) as PrecisionDBO[];
  });

  describe('GET /precisions', () => {
    const testRoute = '/precisions';

    it('should return the referential of precisions', async () => {
      const { body, status } = await request(url).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const precisions = (
        (await kysely
          .selectFrom('precisions')
          .selectAll('precisions')
          .execute()) as PrecisionDBO[]
      ).map(toPrecisionDTO);
      expect(body).toIncludeSameMembers(precisions);
    });
  });

  describe('GET /housing/:id/precisions', () => {
    const testRoute = (id: string) => `/housing/${id}/precisions`;

    let housing: HousingApi;
    let housingPrecisions: PrecisionDBO[];

    beforeAll(async () => {
      housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      housingPrecisions = faker.helpers.arrayElements(precisions, 3);

      await kysely
        .insertInto('housingPrecisions')
        .values(
          housingPrecisions.map((precision) => ({
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            precisionId: precision.id
          }))
        )
        .execute();
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
    const testRoute = (id: string) => `/housing/${id}/precisions`;

    let housing: HousingApi;
    let payload: ReadonlyArray<Precision['id']>;

    beforeEach(async () => {
      housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      const existingPrecisions = faker.helpers.arrayElements(precisions, 3);
      await kysely
        .insertInto('housingPrecisions')
        .values(
          existingPrecisions.map((precision) => ({
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            precisionId: precision.id,
            createdAt: new Date()
          }))
        )
        .execute();

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

    it('should link the housing to the precisions', async () => {
      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actualPrecisions = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
      expect(actualPrecisions).toHaveLength(payload.length);
      expect(actualPrecisions).toSatisfyAll<
        Selectable<DB['housingPrecisions']>
      >((actualPrecision) => {
        return payload.some(
          (precision) => precision === actualPrecision.precisionId
        );
      });
    });

    it('should fully replace the housing precisions', async () => {
      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actualPrecisions = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
      expect(actualPrecisions).toHaveLength(payload.length);
      expect(actualPrecisions).toSatisfyAll<
        Selectable<DB['housingPrecisions']>
      >((actualPrecision) => {
        return payload.some(
          (precision) => precision === actualPrecision.precisionId
        );
      });
    });

    it('should empty the housing precisions', async () => {
      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send([])
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actualPrecisions = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
      expect(actualPrecisions).toHaveLength(0);
    });

    it('should create an event when a precision is attached', async () => {
      const housingWithoutPrecisions = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });

      const { status } = await request(url)
        .put(testRoute(housingWithoutPrecisions.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'precisionHousingEvents',
          'precisionHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:precision-attached')
        .where(
          'precisionHousingEvents.housingGeoCode',
          '=',
          housingWithoutPrecisions.geoCode
        )
        .where(
          'precisionHousingEvents.housingId',
          '=',
          housingWithoutPrecisions.id
        )
        .execute();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should create an event when a precision is detached', async () => {
      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send([])
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'precisionHousingEvents',
          'precisionHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:precision-detached')
        .where('precisionHousingEvents.housingGeoCode', '=', housing.geoCode)
        .where('precisionHousingEvents.housingId', '=', housing.id)
        .execute();
      expect(events.length).toBeGreaterThan(0);
    });
  });
});
