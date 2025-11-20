import { faker } from '@faker-js/faker';
import {
  genDatafoncierHousing,
  genIdprocpte
} from '@zerologementvacant/models/fixtures';
import { constants } from 'http2';
import request from 'supertest';
import db from '~/infra/database';

import { createServer } from '~/infra/server';
import {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
import { DatafoncierHouses } from '~/repositories/datafoncierHousingRepository';
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

describe('Datafoncier housing controller', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi('54321');
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('findOne', () => {
    const testRoute = (localId: string) =>
      `/api/datafoncier/housing/${localId}`;

    it('should return the housing if it exists', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = genBuildingApi();
      const housing = genDatafoncierHousing(idprocpte, building.id);
      await Buildings().insert(formatBuildingApi(building));
      await DatafoncierHouses().insert({
        ...housing,
        ban_geom: db.raw('ST_GeomFromGeoJSON(?)', [housing.ban_geom]),
        geomloc: db.raw('ST_GeomFromGeoJSON(?)', [housing.geomloc]),
        geomrnb: db.raw('ST_GeomFromGeoJSON(?)', [housing.geomrnb])
      });

      const { body, status } = await request(url)
        .get(testRoute(housing.idlocal))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual(housing);
    });

    it('should return "not found" if the given local id does not belong to the user’s establishment', async () => {
      const idprocpte = genIdprocpte('12345');
      const building = genBuildingApi();
      const housing = genDatafoncierHousing(idprocpte, building.id);
      await Buildings().insert(formatBuildingApi(building));
      await DatafoncierHouses().insert({
        ...housing,
        ban_geom: db.raw('ST_GeomFromGeoJSON(?)', [housing.ban_geom]),
        geomloc: db.raw('ST_GeomFromGeoJSON(?)', [housing.geomloc]),
        geomrnb: db.raw('ST_GeomFromGeoJSON(?)', [housing.geomrnb])
      });

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
