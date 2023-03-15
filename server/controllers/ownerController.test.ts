import request from 'supertest';
import { constants } from 'http2';
import { createServer } from '../server';
import fetchMock from 'jest-fetch-mock';
import { withAccessToken } from '../test/testUtils';
import { Housing1 } from '../../database/seeds/test/005-housing';

const { app } = createServer();

describe('Owner controller', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

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
            housingCount: 3,
          }),
        ])
      );
    });
  });
});
