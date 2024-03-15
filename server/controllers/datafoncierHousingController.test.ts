import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '../server';
import { tokenProvider } from '../test/testUtils';
import {
  genDatafoncierHousing,
  genEstablishmentApi,
  genUserApi,
  oneOf,
} from '../test/testFixtures';
import { DatafoncierHouses } from '../repositories/datafoncierHousingRepository';
import { formatUserApi, Users } from '../repositories/userRepository';
import {
  Establishments,
  formatEstablishmentApi,
} from '../repositories/establishmentRepository';

describe('Datafoncier housing controller', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('findOne', () => {
    const testRoute = (localId: string) =>
      `/api/datafoncier/housing/${localId}`;

    it('should return the housing if it exists', async () => {
      const housing = genDatafoncierHousing(oneOf(establishment.geoCodes));
      await DatafoncierHouses().insert(housing);

      const { body, status } = await request(app)
        .get(testRoute(housing.idlocal))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(housing);
    });

    it('should return "not found" if the given local id does not belong to the user’s establishment', async () => {
      const housing = genDatafoncierHousing('12345');
      await DatafoncierHouses().insert(housing);

      const { status } = await request(app)
        .get(testRoute(`1234512345678`))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return "not found" otherwise', async () => {
      fetchMock.mockIf(
        (request) => request.url.endsWith(`/ff/locaux/missing`),
        async () => ({
          status: 404,
        })
      );

      const { status } = await request(app)
        .get(testRoute('missing'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
