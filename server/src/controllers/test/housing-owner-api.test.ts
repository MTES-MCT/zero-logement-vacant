import { constants } from 'node:http2';

import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingOwnerPayloadDTO,
  type OwnerRank
} from '@zerologementvacant/models';
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
