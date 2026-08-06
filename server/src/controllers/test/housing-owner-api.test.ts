import { constants } from 'node:http2';

import { faker } from '@faker-js/faker/locale/fr';
import { HousingOwnerPayloadDTO } from '@zerologementvacant/models';
import request from 'supertest';

import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { tokenProvider } from '~/test/testUtils';

describe('Housing owner API', () => {
  let establishment: EstablishmentApi;
  let user: UserApi;

  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();

    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('PUT /housing/:housingId/owners', () => {
    const testRoute = (housingId: string) => `/housing/${housingId}/owners`;

    it('should refresh is_multi_owner for affected owners', async () => {
      // The target housing must sit within the establishment's perimeter, as
      // the endpoint looks it up scoped to establishment.geoCodes.
      const [housing1, housing2] = await factories.housing.createList(2, {
        geoCode: establishment.geoCodes[0]
      });
      const owner = await factories.owner.create();
      // owner is already rank=1 in housing1 → will become multi-owner after this call
      await factories
        .housingOwner({ housing: housing1, owner })
        .create({ rank: 1 });

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

      const actual = await kysely
        .selectFrom('owners')
        .selectAll('owners')
        .where('id', '=', owner.id)
        .executeTakeFirst();
      expect(actual?.isMultiOwner).toBe(true);
    });
  });

  describe('GET /owners/:id/housings', () => {
    const testRoute = (id: string) => `/owners/${id}/housings`;

    let owner: OwnerApi;

    beforeAll(async () => {
      owner = await factories.owner.create();
      const housings = await factories.housing.createList(
        faker.number.int({ min: 2, max: 5 })
      );
      await Promise.all(
        housings.map((housing) =>
          factories.housingOwner({ housing, owner }).create()
        )
      );
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
