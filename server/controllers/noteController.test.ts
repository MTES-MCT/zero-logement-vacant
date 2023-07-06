import request from 'supertest';
import { constants } from 'http2';

import { createServer } from '../server';
import { withAccessToken } from '../test/testUtils';
import { Housing1 } from '../../database/seeds/test/005-housing';

const { app } = createServer();

describe('Note controller', () => {
  describe('listByHousingId', () => {
    const testRoute = (housingId: string) => `/api/notes/housing/${housingId}`;

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

    it('should list the housing notes', async () => {
      const res = await withAccessToken(
        request(app).get(testRoute(Housing1.id))
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toStrictEqual([]);
    });
  });
});
