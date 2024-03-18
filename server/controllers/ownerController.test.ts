import { addDays } from 'date-fns';
import { constants } from 'http2';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { createServer } from '../server';
import { tokenProvider, withAccessToken } from '../test/testUtils';
import {
  genAddressApi,
  genEstablishmentApi,
  genHousingApi,
  genOwnerApi,
  genUserApi,
  oneOf,
} from '../test/testFixtures';
import { formatOwnerApi, Owners } from '../repositories/ownerRepository';
import { OwnerPayloadDTO } from '../../shared';
import {
  EventDBO,
  Events,
  eventsTable,
  OwnerEventDBO,
  ownerEventsTable,
} from '../repositories/eventRepository';
import { OwnerApi } from '../models/OwnerApi';
import db from '../repositories/db';
import {
  banAddressesTable,
  formatAddressApi,
} from '../repositories/banAddressesRepository';
import { AddressKinds } from '../../shared/models/AdresseDTO';
import {
  Establishments,
  formatEstablishmentApi,
} from '../repositories/establishmentRepository';
import { formatUserApi, Users } from '../repositories/userRepository';
import {
  formatHousingRecordApi,
  Housing,
} from '../repositories/housingRepository';
import {
  formatHousingOwnersApi,
  HousingOwners,
} from '../repositories/housingOwnerRepository';

describe('Owner API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /owners/housing/{id}', () => {
    const testRoute = (housingId: string) => `/api/owners/housing/${housingId}`;

    const housing = genHousingApi(oneOf(establishment.geoCodes));
    const owners: OwnerApi[] = Array.from({ length: 3 }, () => genOwnerApi());

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(formatHousingOwnersApi(housing, owners));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return the owner list for a housing', async () => {
      const { body, status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toSatisfyAll<OwnerApi>((owner) => {
        return owners.map((owner) => owner.id).includes(owner.id);
      });
    });
  });

  describe('PUT /owners/{id}', () => {
    const testRoute = (id: string) => `/api/owners/${id}`;

    let original: OwnerApi;

    beforeEach(async () => {
      original = genOwnerApi();
      await Owners().insert(formatOwnerApi(original));
    });

    it('should reject if the owner is missing', async () => {
      const payload: OwnerPayloadDTO = {
        ...original,
        birthDate: original.birthDate?.toISOString().substring(0, 10),
        phone: '+33 6 12 34 56 78',
      };

      const { status } = await withAccessToken(
        request(app)
          .put(testRoute(uuidv4()))
          .send(payload)
          .set('Content-Type', 'application/json')
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update an owner', async () => {
      const original = genOwnerApi();
      await Owners().insert(formatOwnerApi(original));
      const birthDate = new Date('2000-01-01');
      const payload: OwnerPayloadDTO = {
        ...original,
        birthDate: birthDate.toISOString()?.substring(0, 10),
        phone: '+33 6 12 34 56 78',
      };

      const { body, status } = await request(app)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        ...payload,
        birthDate: birthDate.toISOString(),
      });
    });

    it('should create an event if the name or birth date has changed', async () => {
      const original = genOwnerApi();
      await Owners().insert(formatOwnerApi(original));
      const payload: OwnerPayloadDTO = {
        ...original,
        birthDate: addDays(original.birthDate ?? new Date(), 1)
          .toISOString()
          .substring(0, 10),
      };

      const { status } = await request(app)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(
          ownerEventsTable,
          `${ownerEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where({ owner_id: original.id });
      expect(events).toBeArrayOfSize(1);
      expect(events[0]).toMatchObject<
        Partial<EventDBO<OwnerApi> & OwnerEventDBO>
      >({
        owner_id: original.id,
        name: "Modification d'identité",
        kind: 'Update',
        category: 'Ownership',
        section: 'Coordonnées propriétaire',
      });
    });

    it('should create an event if the email or phone has changed', async () => {
      const original = genOwnerApi();
      await Owners().insert(formatOwnerApi(original));
      const payload: OwnerPayloadDTO = {
        ...original,
        birthDate: original.birthDate?.toISOString(),
        phone: '+33 6 12 34 56 78',
      };

      const { status } = await request(app)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(
          ownerEventsTable,
          `${ownerEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where({ owner_id: original.id });
      expect(events).toPartiallyContain<
        Partial<EventDBO<OwnerApi> & OwnerEventDBO>
      >({
        owner_id: original.id,
        name: 'Modification de coordonnées',
        kind: 'Update',
        category: 'Ownership',
        section: 'Coordonnées propriétaire',
      });
    });

    it('should create an event if the address has changed', async () => {
      const original = genOwnerApi();
      const originalAddress = genAddressApi(original.id, AddressKinds.Owner);
      await Owners().insert(formatOwnerApi(original));
      await db(banAddressesTable).insert(formatAddressApi(originalAddress));
      const payload: OwnerPayloadDTO = {
        ...original,
        birthDate: original.birthDate?.toISOString(),
        banAddress: genAddressApi(original.id, AddressKinds.Owner),
      };

      const { status } = await request(app)
        .put(testRoute(original.id))
        .send(payload)
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(
          ownerEventsTable,
          `${ownerEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where({ owner_id: original.id });
      expect(events).toPartiallyContain<
        Partial<EventDBO<OwnerApi> & OwnerEventDBO>
      >({
        owner_id: original.id,
        name: 'Modification de coordonnées',
        kind: 'Update',
        category: 'Ownership',
        section: 'Coordonnées propriétaire',
      });
    });
  });

  describe('PUT /owners/housing/{id}', () => {
    const testRoute = (id: string) => `/api/owners/housing/${id}`;

    it('should reject if the housing is missing', async () => {
      const payload = {
        // TODO
      };

      const { status } = await request(app)
        .put(testRoute(uuidv4()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
