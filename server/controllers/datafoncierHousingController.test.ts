import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '../server';
import { withAccessToken } from '../test/testUtils';
import { genDatafoncierHousing } from '../test/testFixtures';
import { Locality1 } from '../../database/seeds/test/001-establishments';
import { DatafoncierHouses } from '../repositories/datafoncierHousingRepository';

describe('Datafoncier housing controller', () => {
  const { app } = createServer();

  describe('findOne', () => {
    const testRoute = (localId: string) =>
      `/api/datafoncier/housing/${localId}`;

    it('should return the housing if it exists', async () => {
      const housing = genDatafoncierHousing(Locality1.geoCode);
      await DatafoncierHouses().insert(housing);

      const { body, status } = await withAccessToken(
        request(app).get(testRoute(housing.idlocal))
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(housing);
    });

    it('should return "not found" if the given local id does not belong to the user’s establishment', async () => {
      const housing = genDatafoncierHousing('12345');
      await DatafoncierHouses().insert(housing);
      const { status } = await withAccessToken(
        request(app).get(testRoute(`1234512345678`))
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
