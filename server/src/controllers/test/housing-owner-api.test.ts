import { faker } from '@faker-js/faker/locale/fr';
import { HousingOwnerPayloadDTO } from '@zerologementvacant/models';
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
import { toUserDBO, Users } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingOwnerApi,
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
    await Users().insert(toUserDBO(user));
  });

  describe('PUT /housing/:housingId/owners', () => {
    const testRoute = (housingId: string) =>
      `/api/housing/${housingId}/owners`;

    it('should refresh is_multi_owner for affected owners', async () => {
      const housing1 = genHousingApi(establishment.geoCodes[0]);
      const housing2 = genHousingApi(establishment.geoCodes[0]);
      const owner = genOwnerApi();
      await Housing().insert([housing1, housing2].map(formatHousingRecordApi));
      await Owners().insert(formatOwnerApi(owner));
      // owner is already rank=1 in housing1 → will become multi-owner after this call
      await HousingOwners().insert(
        formatHousingOwnerApi({
          ...genHousingOwnerApi(housing1, owner),
          rank: 1
        })
      );

      const payload: HousingOwnerPayloadDTO[] = [
        {
          id: owner.id,
          rank: 1,
          idprocpte: null,
          idprodroit: null,
          locprop: null,
          propertyRight: null
        }
      ];

      await request(url)
        .put(testRoute(housing2.id))
        .send(payload)
        .use(tokenProvider(user));

      const actual = await Owners().where({ id: owner.id }).first();
      expect(actual?.is_multi_owner).toBe(true);
    });
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
    const housingOwners = housings.map<HousingOwnerApi>((housing) =>
      genHousingOwnerApi(housing, owner)
    );

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
