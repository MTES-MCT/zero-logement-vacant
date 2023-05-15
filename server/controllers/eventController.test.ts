import request from 'supertest';
import { constants } from 'http2';
import { withAccessToken } from '../test/testUtils';
import { createServer } from '../server';
import { Owner1 } from '../../database/seeds/test/004-owner';
import {
  HousingEvent1,
  OwnerEvent1,
} from '../../database/seeds/test/011-events';
import { Housing1 } from '../../database/seeds/test/005-housing';

describe('Event controller', () => {
  const { app } = createServer();

  describe('listByOwnerId', () => {
    const testRoute = (ownerId: string) => `/api/events/owner/${ownerId}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute(Owner1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid ownerId', async () => {
      await withAccessToken(request(app).get(testRoute('id'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );
    });

    it('should list the owner events', async () => {
      const res = await withAccessToken(
        request(app).get(testRoute(Owner1.id))
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            id: OwnerEvent1.id,
          }),
        ])
      );
    });
  });

  describe('listByHousingId', () => {
    const testRoute = (housingId: string) => `/api/events/housing/${housingId}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute(Housing1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid housingId', async () => {
      await withAccessToken(request(app).get(testRoute('id'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );
    });

    it('should list the housing events', async () => {
      const res = await withAccessToken(
        request(app).get(testRoute(Housing1.id))
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            id: HousingEvent1.id,
          }),
        ])
      );
    });
  });
});
