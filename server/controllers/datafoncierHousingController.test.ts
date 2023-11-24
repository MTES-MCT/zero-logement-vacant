import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '../server';
import { withAccessToken } from '../test/testUtils';
import { genDatafoncierHousing } from '../test/testFixtures';
import { Locality1 } from '../../database/seeds/test/001-establishments';

describe('Datafoncier housing controller', () => {
  const { app } = createServer();

  describe('findOne', () => {
    const testRoute = (localId: string) =>
      `/api/datafoncier/housing/${localId}`;

    it('should return the housing if it exists', async () => {
      const housing = genDatafoncierHousing(Locality1.geoCode);
      fetchMock.mockIf(
        (request) => request.url.endsWith(`/ff/locaux/${housing.idlocal}`),
        async () => ({
          status: 200,
          body: JSON.stringify(housing),
        })
      );

      const { body, status } = await withAccessToken(
        request(app).get(testRoute(housing.idlocal))
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(housing);
    });

    it('should return "not found" if the given local id does not belong to the user’s establishment', async () => {
      const { status } = await withAccessToken(
        request(app).get(testRoute(`0000012345678`))
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return "not found" otherwise', async () => {
      fetchMock.mockIf(
        (request) => request.url.endsWith(`/ff/locaux/missing`),
        async () => ({
          status: 404,
        })
      );

      const { status } = await withAccessToken(
        request(app).get(testRoute('missing'))
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
