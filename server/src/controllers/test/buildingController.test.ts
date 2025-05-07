import { faker } from '@faker-js/faker/locale/fr';
import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '~/infra/server';
import { toBuildingDTO } from '~/models/BuildingApi';
import {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genBuildingApi,
  genEstablishmentApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Building API', () => {
  const { app } = createServer();
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /buildings', () => {
    const testRoute = '/api/buildings';

    const buildings = faker.helpers.multiple(genBuildingApi, {
      count: { min: 3, max: 10 }
    });

    beforeAll(async () => {
      await Buildings().insert(buildings.map(formatBuildingApi));
    });

    it('should be forbidden for non-authenticated users', async () => {
      const { status } = await request(app).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return all the buildings', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThanOrEqual(buildings.length);
    });

    it('should filter by id', async () => {
      const slice = buildings.slice(0, 2);

      const { body, status } = await request(app)
        .get(testRoute)
        .query({
          id: slice.map((building) => building.id).join(',')
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(slice.map(toBuildingDTO));
    });
  });

  describe('GET /buildings/:id', () => {
    const testRoute = (id: string) => `/api/buildings/${id}`;

    const building = genBuildingApi();

    beforeAll(async () => {
      await Buildings().insert(formatBuildingApi(building));
    });

    it('should be forbidden for non-authenticated users', async () => {
      const { status } = await request(app).get(testRoute(building.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should throw if the building is missing', async () => {
      const missing = faker.string.uuid();
      const { status } = await request(app)
        .get(testRoute(missing))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the building if it exists', async () => {
      const { body, status } = await request(app)
        .get(testRoute(building.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(toBuildingDTO(building));
    });
  });
});
