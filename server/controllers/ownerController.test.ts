import { constants } from 'http2';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from '../server';
import { withAccessToken } from '../test/testUtils';
import { Housing1 } from '../../database/seeds/test/005-housing';
import { genOwnerApi } from '../test/testFixtures';
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
import { addDays } from 'date-fns';

describe('Owner controller', () => {
  const { app } = createServer();

  describe('listByHousing', () => {
    const testRoute = (housingId: string) => `/api/owners/housing/${housingId}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute(Housing1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return the owner list for a housing', async () => {
      const res = await withAccessToken(
        request(app).get(testRoute(Housing1.id))
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.status).toBe(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            housingId: Housing1.id,
          }),
        ])
      );
    });
  });

  describe('update', () => {
    const testRoute = (id: string) => `/api/owners/${id}`;

    const original = genOwnerApi();

    beforeEach(async () => {
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

      const { body, status } = await withAccessToken(
        request(app)
          .put(testRoute(original.id))
          .send(payload)
          .set('Content-Type', 'application/json')
      );

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

      const { status } = await withAccessToken(
        request(app)
          .put(testRoute(original.id))
          .send(payload)
          .set('Content-Type', 'application/json')
      );

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

    it('should create an event if the address, email or phone has changed', async () => {
      const original = genOwnerApi();
      await Owners().insert(formatOwnerApi(original));
      const payload: OwnerPayloadDTO = {
        ...original,
        birthDate: original.birthDate?.toISOString(),
        phone: '+33 6 12 34 56 78',
      };

      const { status } = await withAccessToken(
        request(app)
          .put(testRoute(original.id))
          .send(payload)
          .set('Content-Type', 'application/json')
      );

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

  describe('updateHousingOwners', () => {
    const testRoute = (id: string) => `/api/owners/housing/${id}`;

    it('should reject if the housing is missing', async () => {
      const payload = {
        // TODO
      };

      const { status } = await withAccessToken(
        request(app).put(testRoute(uuidv4())).send(payload)
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
