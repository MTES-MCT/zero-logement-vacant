import { faker } from '@faker-js/faker/locale/fr';
import {
  ACTIVE_OWNER_RANKS,
  PROPERTY_RIGHT_VALUES
} from '@zerologementvacant/models';
import { constants } from 'node:http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genOwnerApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Housing owner API', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();

    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /owners/:id/housings', () => {
    const testRoute = (id: string) => `/api/owners/${id}/housings`;

    const housings = faker.helpers.multiple(
      () => genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
      {
        count: { min: 2, max: 5 }
      }
    );
    const owner = genOwnerApi();
    const housingOwners = housings.map<HousingOwnerApi>((housing) => ({
      ...owner,
      ownerId: owner.id,
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
      rank: faker.helpers.arrayElement(ACTIVE_OWNER_RANKS),
      propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES)
    }));

    beforeAll(async () => {
      await Housing().insert(housings.map(formatHousingRecordApi));
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));
    });

    it('should throw an error if the owner is missing', async () => {
      const { status } = await request(url)
        .get(testRoute(faker.string.uuid()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return housings for a given owner', async () => {
      const { status } = await request(url)
        .get(testRoute(owner.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });
  });
});
