import request from 'supertest';
import { constants } from 'http2';

import { tokenProvider } from '../test/testUtils';
import { createServer } from '../server';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingEventApi,
  genOwnerApi,
  genOwnerEventApi,
  genUserApi,
  oneOf,
} from '../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi,
} from '../repositories/establishmentRepository';
import { formatUserApi, Users } from '../repositories/userRepository';
import { formatOwnerApi, Owners } from '../repositories/ownerRepository';
import { HousingEventApi, OwnerEventApi } from '../models/EventApi';
import {
  Events,
  formatEventApi,
  formatHousingEventApi,
  formatOwnerEventApi,
  HousingEvents,
  OwnerEvents,
} from '../repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing,
} from '../repositories/housingRepository';

describe('Event API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /owners/{id}/events', () => {
    const testRoute = (id: string) => `/api/owners/${id}/events`;

    const owner = genOwnerApi();

    beforeAll(async () => {
      await Owners().insert(formatOwnerApi(owner));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(owner.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid ownerId', async () => {
      const { status } = await request(app)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list the owner events', async () => {
      const events: OwnerEventApi[] = Array.from({ length: 3 }).map(() =>
        genOwnerEventApi(owner.id, user.id)
      );
      await Events().insert(events.map(formatEventApi));
      await OwnerEvents().insert(events.map(formatOwnerEventApi));

      const { body, status } = await request(app)
        .get(testRoute(owner.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfy(() => {
        const ids = new Set([...body.map((event: OwnerEventApi) => event.id)]);
        return events.every((event) => ids.has(event.id));
      });
    });
  });

  describe('GET /housing/{id}/events', () => {
    const testRoute = (id: string) => `/api/housing/${id}/events`;

    const housing = genHousingApi(oneOf(establishment.geoCodes));

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid housingId', async () => {
      const { status } = await request(app)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list the housing events', async () => {
      const events: HousingEventApi[] = Array.from({ length: 3 }).map(() =>
        genHousingEventApi(housing, user)
      );
      await Events().insert(events.map(formatEventApi));
      await HousingEvents().insert(events.map(formatHousingEventApi));

      const { body, status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfy(() => {
        const ids = new Set([
          ...body.map((event: HousingEventApi) => event.id),
        ]);
        return events.every((event) => ids.has(event.id));
      });
    });
  });
});
