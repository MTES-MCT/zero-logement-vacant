import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import { constants } from 'http2';
import request from 'supertest';

import {
  ESTABLISHMENT_KIND_VALUES,
  EstablishmentFiltersDTO,
  UserRole,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import { GEO_CODE_REGEXP } from '@zerologementvacant/schemas';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { genEstablishmentApi, genUserApi } from '~/test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { tokenProvider } from '~/test/testUtils';
import { formatUserApi, Users } from '~/repositories/userRepository';
import type { UserApi } from '~/models/UserApi';

describe('Establishment API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  describe('GET /establishments', () => {
    const testRoute = '/api/establishments';

    const establishments: EstablishmentApi[] = Array.from({ length: 10 }).map(
      () => genEstablishmentApi()
    );

    beforeAll(async () => {
      await Establishments().insert(establishments.map(formatEstablishmentApi));
    });

    test.prop<EstablishmentFiltersDTO>({
      id: fc.option(fc.array(fc.uuid({ version: 4 }), { minLength: 1 }), {
        nil: undefined
      }),
      available: fc.option(fc.boolean(), { nil: undefined }),
      kind: fc.option(
        fc.array(fc.constantFrom(...ESTABLISHMENT_KIND_VALUES), {
          minLength: 1
        }),
        {
          nil: undefined
        }
      ),
      name: fc.option(fc.string(), { nil: undefined }),
      geoCodes: fc.option(
        fc.array(fc.stringMatching(GEO_CODE_REGEXP), {
          minLength: 5,
          maxLength: 5
        }),
        { nil: undefined }
      ),
      siren: fc.option(
        fc.array(fc.stringMatching(/^[0-9]{9}$/), { minLength: 1 }),
        {
          nil: undefined
        }
      ),
      query: fc.option(fc.stringMatching(/^[a-zA-Z0-9\s]*$/), {
        nil: undefined
      })
    })('should validate inputs', async (query) => {
      const { status } = await request(url)
        .get(testRoute)
        .query({
          id: query.id?.join(','),
          available: query.available,
          kind: query.kind?.join(','),
          name: query.name,
          geoCodes: query.geoCodes?.join(','),
          siren: query.siren?.join(','),
          query: query.query
        });

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should return an empty array where no establishment is found', async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .query({
          query: faker.string.sample(10)
        });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toEqual([]);
    });

    it('should list available establishments', async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .query({ available: true });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toSatisfyAll<EstablishmentApi>((establishment) => {
        return establishment.available;
      });
    });

    it('should search establishments by query', async () => {
      const [firstEstablishment] = establishments;

      const { body, status } = await request(url)
        .get(testRoute)
        .query({
          query: firstEstablishment.name.substring(1, 3)
        });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toPartiallyContain({
        id: firstEstablishment.id,
        name: firstEstablishment.name
      });
    });

    it('should list establishments by geo code', async () => {
      const [firstEstablishment] = establishments;

      const { body, status } = await request(url)
        .get(testRoute)
        .query({
          geoCodes: faker.helpers.arrayElement(firstEstablishment.geoCodes)
        });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toPartiallyContain({
        id: firstEstablishment.id,
        name: firstEstablishment.name
      });
    });

    describe('Include users', () => {
      const establishment = genEstablishmentApi();
      const user: UserApi = {
        ...genUserApi(establishment.id),
        role: UserRole.USUAL
      };

      beforeAll(async () => {
        await Establishments().insert(formatEstablishmentApi(establishment));
        await Users().insert(formatUserApi(user));
      });

      it('should include users on demand if the user is authenticated', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toSatisfyAll<EstablishmentDTO>((establishment) => {
          return establishment.users !== undefined;
        });
      });

      it('should not include users by default', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toSatisfyAll<EstablishmentDTO>((establishment) => {
          return establishment.users === undefined;
        });
      });

      it('should not include users if the user is anonymous', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ include: 'users' });

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toSatisfyAll<EstablishmentDTO>((establishment) => {
          return establishment.users === undefined;
        });
      });
    });
  });
});
