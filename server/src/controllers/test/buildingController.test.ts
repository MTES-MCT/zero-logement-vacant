import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { BuildingApi, toBuildingDTO } from '~/models/BuildingApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { tokenProvider } from '~/test/testUtils';

describe('Building API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('GET /buildings', () => {
    const testRoute = '/buildings';

    let buildings: BuildingApi[];

    beforeAll(async () => {
      buildings = await factories.building.createList(
        faker.number.int({ min: 3, max: 10 })
      );
    });

    it('should be forbidden for non-authenticated users', async () => {
      const { status } = await request(url).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return all the buildings', async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThanOrEqual(buildings.length);
    });

    it('should filter by id', async () => {
      const slice = buildings.slice(0, 2);

      const { body, status } = await request(url)
        .get(testRoute)
        .query({
          id: slice.map((building) => building.id).join(',')
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toIncludeSameMembers(slice.map(toBuildingDTO));
    });
  });

  describe('GET /buildings/:id', () => {
    const testRoute = (id: string) => `/buildings/${id}`;

    let building: BuildingApi;

    beforeAll(async () => {
      building = await factories.building.create();
    });

    it('should be forbidden for non-authenticated users', async () => {
      const { status } = await request(url).get(testRoute(building.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should throw if the building is missing', async () => {
      const missing = faker.string.uuid();
      const { status } = await request(url)
        .get(testRoute(missing))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the building if it exists', async () => {
      const { body, status } = await request(url)
        .get(testRoute(building.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(toBuildingDTO(building));
    });
  });
});
