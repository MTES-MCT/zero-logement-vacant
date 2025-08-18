import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { DatafoncierHouses } from '~/repositories/datafoncierHousingRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genDatafoncierHousing,
  genEstablishmentApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Datafoncier housing controller', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

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

      const { body, status } = await request(url)
        .get(testRoute(housing.idlocal))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(housing);
    });

    it('should return "not found" if the given local id does not belong to the user’s establishment', async () => {
      const housing = genDatafoncierHousing('12345');
      await DatafoncierHouses().insert(housing);

      const { status } = await request(url)
        .get(testRoute(housing.idlocal))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return "not found" otherwise', async () => {
      const { status } = await request(url)
        .get(testRoute('missing'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });
});
