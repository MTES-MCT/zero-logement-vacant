import { constants } from 'node:http2';

import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingOwnerPayloadDTO,
  type OwnerRank
} from '@zerologementvacant/models';
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

    // Seeds an owner with two housings — one inside the user's perimeter
    // (editable) and one OUTSIDE it — plus a co-owner on the second housing.
    // The "outside" housing proves the do-not-contact status is propagated
    // globally, not just within the establishment perimeter.
    async function seedScenario(ranks: {
      ownerOnA: OwnerRank;
      ownerOnB: OwnerRank;
      coOwnerOnB: OwnerRank;
    }) {
      const outsideGeoCode = establishment.geoCodes.includes('75056')
        ? '13055'
        : '75056';
      const housingA = genHousingApi(establishment.geoCodes[0]);
      const housingB = genHousingApi(outsideGeoCode);
      const owner = genOwnerApi();
      const coOwner = genOwnerApi();
      await Housing().insert([housingA, housingB].map(formatHousingRecordApi));
      await Owners().insert([owner, coOwner].map(formatOwnerApi));
      await HousingOwners().insert(
        [
          { ...genHousingOwnerApi(housingA, owner), rank: ranks.ownerOnA },
          { ...genHousingOwnerApi(housingB, owner), rank: ranks.ownerOnB },
          { ...genHousingOwnerApi(housingB, coOwner), rank: ranks.coOwnerOnB }
        ].map(formatHousingOwnerApi)
      );
      return { housingA, housingB, owner, coOwner };
    }

    async function putOwnerRank(
      housingId: string,
      ownerId: string,
      rank: OwnerRank
    ) {
      const payload: HousingOwnerPayloadDTO[] = [
        {
          id: ownerId,
          rank,
          idprocpte: null,
          idprodroit: null,
          locprop: null,
          propertyRight: null
        }
      ];
      await request(url)
        .put(testRoute(housingId))
        .send(payload)
        .use(tokenProvider(user));
    }

    const rankOf = async (housingId: string, ownerId: string) =>
      (
        await HousingOwners()
          .where({ housing_id: housingId, owner_id: ownerId })
          .first()
      )?.rank;

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

    it('should propagate "do not contact" globally to the owner’s other housings, even outside the perimeter', async () => {
      const { housingA, housingB, owner, coOwner } = await seedScenario({
        ownerOnA: 1,
        ownerOnB: 1,
        coOwnerOnB: 2
      });

      await putOwnerRank(housingA.id, owner.id, -4);

      expect(await rankOf(housingA.id, owner.id)).toBe(-4);
      // Propagated to the out-of-perimeter housing too
      expect(await rankOf(housingB.id, owner.id)).toBe(-4);
      // The next owner is promoted to primary on the propagated housing
      expect(await rankOf(housingB.id, coOwner.id)).toBe(1);
    });

    it('should clear "do not contact" globally when the owner is reactivated', async () => {
      const { housingA, housingB, owner } = await seedScenario({
        ownerOnA: -4,
        ownerOnB: -4,
        coOwnerOnB: 1
      });

      await putOwnerRank(housingA.id, owner.id, 1);

      const rank = await rankOf(housingB.id, owner.id);
      // No longer do-not-contact on the other perimeter housing
      expect(rank).not.toBe(-4);
      expect(rank).toBeGreaterThanOrEqual(1);
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
