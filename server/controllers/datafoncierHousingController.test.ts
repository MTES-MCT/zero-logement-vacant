import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '../server';
import { withAccessToken } from '../test/testUtils';
import { genDatafoncierHousing } from '../test/testFixtures';

describe('Datafoncier housing controller', () => {
  const { app } = createServer();

  describe('findOne', () => {
    const testRoute = (invar: string) => `/api/datafoncier/housing/${invar}`;

    it('should return the housing if it exist', async () => {
      const housing = genDatafoncierHousing();
      fetchMock.mockIf(
        (request) => request.url.endsWith(`/ff/locaux/${housing.invar}`),
        async () => ({
          status: 200,
          body: JSON.stringify(housing),
        })
      );

      const { body, status } = await withAccessToken(
        request(app).get(testRoute(housing.invar))
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(housing);
    });

    it('should return "not found" otherwise', async () => {
      const { status } = await withAccessToken(
        request(app).get(testRoute('missing'))
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
