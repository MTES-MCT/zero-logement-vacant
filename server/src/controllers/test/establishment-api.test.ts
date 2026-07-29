import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import {
  ESTABLISHMENT_KIND_VALUES,
  EstablishmentFiltersDTO,
  UserRole,
  type EstablishmentDTO
} from '@zerologementvacant/models';
import { GEO_CODE_REGEXP } from '@zerologementvacant/schemas';
import request from 'supertest';

import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import type { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';
import { tokenProvider } from '~/test/testUtils';

describe('Establishment API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  describe('GET /establishments', () => {
    const testRoute = '/establishments';

    let establishments: EstablishmentApi[];

    beforeAll(async () => {
      establishments = await factories.establishment.createList(10);
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
      kindAdmin: fc.option(
        fc.array(fc.stringMatching(/^[A-Z][A-Z-]{0,49}$/), {
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
      }),
      related: fc.option(fc.uuid({ version: 4 }), { nil: undefined })
    })('should validate inputs', async (query) => {
      const { status } = await request(url)
        .get(testRoute)
        .query({
          id: query.id?.join(','),
          available: query.available,
          kind: query.kind?.join(','),
          kindAdmin: query.kindAdmin?.join(','),
          name: query.name,
          geoCodes: query.geoCodes?.join(','),
          siren: query.siren?.join(','),
          query: query.query,
          related: query.related
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

    it('should filter establishments by administrative kind', async () => {
      const [metropolis, otherIntercommunality] = await Promise.all([
        factories.establishment.create({ geoCodes: ['06004', '06012', '06088'] }),
        factories.establishment.create({
          geoCodes: ['06004', '06012'],
          kind: 'METRO'
        })
      ]);
      await Promise.all([
        kysely
          .updateTable('establishments')
          .set({ kind: 'ME', kindAdmin: 'METRO' })
          .where('id', '=', metropolis.id)
          .execute(),
        kysely
          .updateTable('establishments')
          .set({ kindAdmin: 'CA' })
          .where('id', '=', otherIntercommunality.id)
          .execute()
      ]);

      const { body, status } = await request(url)
        .get(testRoute)
        .query({ kindAdmin: 'METRO' });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const ids = body.map(
        (establishment: EstablishmentApi) => establishment.id
      );
      expect(ids).toContain(metropolis.id);
      expect(ids).not.toContain(otherIntercommunality.id);
    });

    it('should fall back to legacy kind when administrative kind is missing', async () => {
      const legacyIntercommunality = await factories.establishment.create({
        geoCodes: ['06004', '06012'],
        kind: 'CA'
      });

      const { body, status } = await request(url)
        .get(testRoute)
        .query({ kindAdmin: 'CA' });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(
        body.map((establishment: EstablishmentApi) => establishment.id)
      ).toContain(legacyIntercommunality.id);
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

    it('should list establishments by related establishment', async () => {
      const establishments: ReadonlyArray<EstablishmentApi> = await Promise.all(
        [
          factories.establishment.create({ geoCodes: ['75001', '75002'] }),
          factories.establishment.create({ geoCodes: ['75002', '75003'] }),
          factories.establishment.create({ geoCodes: ['69001', '69002'] })
        ]
      );

      const [relatedEstablishment] = establishments;

      const { body, status } = await request(url).get(testRoute).query({
        related: relatedEstablishment.id
      });

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toSatisfyAll<EstablishmentDTO>((actual) => {
        return actual.geoCodes.some((actualGeoCode) =>
          relatedEstablishment.geoCodes.includes(actualGeoCode)
        );
      });
    });

    describe('Include users', () => {
      let establishment: EstablishmentApi;
      let user: UserApi;

      beforeAll(async () => {
        establishment = await factories.establishment.create();
        user = await factories.user.create({
          establishmentId: establishment.id,
          role: UserRole.USUAL
        });
      });

      it('should include users if the user is authenticated', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toSatisfyAll<EstablishmentDTO>((establishment) => {
          return establishment.users !== undefined;
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

  describe('GET /establishments/:id', () => {
    const testRoute = (id: string) => `/establishments/${id}`;

    it('should return 404 if the establishment does not exist', async () => {
      const { status } = await request(url).get(testRoute(faker.string.uuid()));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the establishment', async () => {
      const establishment = await factories.establishment.create();

      const { body, status } = await request(url).get(
        testRoute(establishment.id)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: establishment.id,
        name: establishment.name
      });
    });
  });
});
