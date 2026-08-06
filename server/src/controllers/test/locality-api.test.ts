import { constants } from 'http2';

import { genGeoCode } from '@zerologementvacant/models/fixtures';
import request from 'supertest';

import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { LocalityApi } from '~/models/LocalityApi';
import { UserApi } from '~/models/UserApi';
import localityRepository, {
  toLocalityInsert
} from '~/repositories/localityRepository';
import { factories } from '~/test/factories';
import { genLocalityApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Locality API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const locality = genLocalityApi();
  const anotherLocality = genLocalityApi();
  let establishment: EstablishmentApi;
  let anotherEstablishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    await kysely
      .insertInto('localities')
      .values([locality, anotherLocality].map(toLocalityInsert))
      .execute();

    establishment = await factories.establishment.create({
      geoCodes: [locality.geoCode]
    });
    anotherEstablishment = await factories.establishment.create({
      geoCodes: [anotherLocality.geoCode]
    });

    await kysely
      .insertInto('establishmentsLocalities')
      .values([
        { establishmentId: establishment.id, localityId: locality.id },
        {
          establishmentId: anotherEstablishment.id,
          localityId: anotherLocality.id
        }
      ])
      .execute();

    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('GET /localities/{geoCode}', () => {
    const testRoute = (geoCode: string) => `/localities/${geoCode}`;

    it('should received valid parameters', async () => {
      const { status } = await request(url).get(testRoute('id'));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be missing', async () => {
      const { status } = await request(url).get(testRoute(genGeoCode()));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should retrieve the locality', async () => {
      const { body, status } = await request(url).get(
        testRoute(locality.geoCode)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        name: locality.name,
        geoCode: locality.geoCode
      });
    });
  });

  describe('GET /localities', () => {
    const testRoute = (establishmentId?: string) =>
      `/localities${
        establishmentId ? '?establishmentId=' + establishmentId : ''
      }`;

    it('should received a valid establishmentId', async () => {
      const { status } = await request(url).get(testRoute('id'));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list the localities', async () => {
      const { body, status } = await request(url).get(
        testRoute(establishment.id)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toPartiallyContain({
        name: locality.name,
        geoCode: locality.geoCode
      });
      expect(body).not.toPartiallyContain({
        name: anotherLocality.name,
        geoCode: anotherLocality.geoCode
      });
    });
  });

  describe('PUT /localities/{id}/tax', () => {
    const testRoute = (geoCode?: string) =>
      `/localities${geoCode ? '/' + geoCode : ''}/tax`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).put(testRoute(locality.geoCode));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a user from another establishment', async () => {
      const { status } = await request(url)
        .put(testRoute(anotherLocality.geoCode))
        .send({ taxKind: 'THLV', taxRate: 10 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be missing', async () => {
      const { status } = await request(url)
        .put(testRoute(genGeoCode()))
        .send({ taxKind: 'THLV', taxRate: 10 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received valid parameters', async () => {
      await request(url)
        .put(testRoute())
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_NOT_FOUND);

      await request(url)
        .put(testRoute('id'))
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .put(testRoute(locality.geoCode))
        .send({ taxRate: 'a' })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: 'TLV', taxRate: 10 })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: 'THLV' })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: 'None', taxRate: 10 })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be a locality without TLV', async () => {
      const { status } = await request(url)
        .put(testRoute(anotherLocality.geoCode))
        .send({ taxKind: 'THLV', taxRate: 10 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should update the locality tax rate', async () => {
      const { body, status } = await request(url)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: 'THLV', taxRate: 10 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<LocalityApi>>({
        geoCode: locality.geoCode,
        taxKind: 'THLV',
        taxRate: 10
      });

      const actual = await kysely
        .selectFrom('localities')
        .selectAll('localities')
        .where('geoCode', '=', locality.geoCode)
        .executeTakeFirst();
      expect(actual).toMatchObject({
        geoCode: locality.geoCode,
        taxKind: 'THLV',
        taxRate: 10
      });
    });

    it('should remove the locality tax', async () => {
      await localityRepository.update({
        ...locality,
        taxRate: 10,
        taxKind: 'THLV'
      });

      const { body, status } = await request(url)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: 'None' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<LocalityApi>>({
        geoCode: locality.geoCode,
        taxKind: 'None'
      });

      const actual = await kysely
        .selectFrom('localities')
        .selectAll('localities')
        .where('geoCode', '=', locality.geoCode)
        .executeTakeFirst();
      expect(actual).toMatchObject({
        geoCode: locality.geoCode,
        taxKind: 'None'
      });
    });
  });

  describe('GET /localities — validation', () => {
    it('should return 400 when query.establishmentId is missing', async () => {
      const { status, body } = await request(url)
        .get('/localities')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
    });

    it('should return 400 when query.establishmentId is not a UUID', async () => {
      const { status, body } = await request(url)
        .get('/localities?establishmentId=not-a-uuid')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/establishmentId/i);
    });
  });

  describe('GET /localities/:geoCode — validation', () => {
    it('should return 400 when :geoCode is not 5 characters', async () => {
      const { status, body } = await request(url)
        .get('/localities/abc')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/geoCode/i);
    });
  });

  describe('PUT /localities/:geoCode/tax — validation', () => {
    it('should return 400 when body.taxKind is invalid', async () => {
      const { status, body } = await request(url)
        .put(`/localities/${locality.geoCode}/tax`)
        .send({ taxKind: 'invalid' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
      expect(body.message).toMatch(/taxKind/i);
    });

    it('should return 400 when taxKind is THLV and taxRate is missing', async () => {
      const { status, body } = await request(url)
        .put(`/localities/${locality.geoCode}/tax`)
        .send({ taxKind: 'THLV' })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
    });

    it('should return 400 when taxKind is None and taxRate is provided', async () => {
      const { status, body } = await request(url)
        .put(`/localities/${locality.geoCode}/tax`)
        .send({ taxKind: 'None', taxRate: 5 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      expect(body).toMatchObject({ name: 'ValidationError' });
    });
  });
});
