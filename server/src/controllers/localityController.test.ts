import { constants } from 'http2';
import request from 'supertest';

import { tokenProvider } from '~/test/testUtils';
import { createServer } from '~/infra/server';
import {
  genEstablishmentApi,
  genGeoCode,
  genLocalityApi,
  genUserApi,
} from '~/test/testFixtures';
import localityRepository, {
  formatLocalityApi,
  Localities,
  LocalityDBO,
} from '~/repositories/localityRepository';
import { LocalityApi, TaxKindsApi } from '~/models/LocalityApi';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';

import { EstablishmentLocalities } from '~/repositories/establishmentLocalityRepository';

describe('Locality API', () => {
  const { app } = createServer();

  const locality = genLocalityApi();
  const establishment = genEstablishmentApi(locality.geoCode);
  const user = genUserApi(establishment.id);
  const anotherLocality = genLocalityApi();
  const anotherEstablishment = genEstablishmentApi(anotherLocality.geoCode);

  beforeAll(async () => {
    await Localities().insert(
      [locality, anotherLocality].map(formatLocalityApi),
    );
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi),
    );
    await EstablishmentLocalities().insert([
      { establishment_id: establishment.id, locality_id: locality.id },
      {
        establishment_id: anotherEstablishment.id,
        locality_id: anotherLocality.id,
      },
    ]);
    await Users().insert(formatUserApi(user));
  });

  describe('GET /localities/{geoCode}', () => {
    const testRoute = (geoCode: string) => `/api/localities/${geoCode}`;

    it('should received valid parameters', async () => {
      const { status } = await request(app).get(testRoute('id'));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be missing', async () => {
      const { status } = await request(app).get(testRoute(genGeoCode()));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should retrieve the locality', async () => {
      const { body, status } = await request(app).get(
        testRoute(locality.geoCode),
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        name: locality.name,
        geoCode: locality.geoCode,
      });
    });
  });

  describe('GET /localities', () => {
    const testRoute = (establishmentId?: string) =>
      `/api/localities${
        establishmentId ? '?establishmentId=' + establishmentId : ''
      }`;

    it('should received a valid establishmentId', async () => {
      const { status } = await request(app).get(testRoute('id'));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list the localities', async () => {
      const { body, status } = await request(app).get(
        testRoute(establishment.id),
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toPartiallyContain({
        name: locality.name,
        geoCode: locality.geoCode,
      });
      expect(body).not.toPartiallyContain({
        name: anotherLocality.name,
        geoCode: anotherLocality.geoCode,
      });
    });
  });

  describe('PUT /localities/{id}/tax', () => {
    const testRoute = (geoCode?: string) =>
      `/api/localities${geoCode ? '/' + geoCode : ''}/tax`;

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).put(testRoute(locality.geoCode));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a user from another establishment', async () => {
      const { status } = await request(app)
        .put(testRoute(anotherLocality.geoCode))
        .send({ taxKind: TaxKindsApi.THLV, taxRate: 10 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be missing', async () => {
      const { status } = await request(app)
        .put(testRoute(genGeoCode()))
        .send({ taxKind: TaxKindsApi.THLV, taxRate: 10 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received valid parameters', async () => {
      await request(app)
        .put(testRoute())
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_NOT_FOUND);

      await request(app)
        .put(testRoute('id'))
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(locality.geoCode))
        .send({ taxRate: 'a' })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: TaxKindsApi.TLV, taxRate: 10 })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: TaxKindsApi.THLV })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: TaxKindsApi.None, taxRate: 10 })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be a locality without TLV', async () => {
      const { status } = await request(app)
        .put(testRoute(anotherLocality.geoCode))
        .send({ taxKind: TaxKindsApi.THLV, taxRate: 10 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should update the locality tax rate', async () => {
      const { body, status } = await request(app)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: TaxKindsApi.THLV, taxRate: 10 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<LocalityApi>>({
        geoCode: locality.geoCode,
        taxKind: TaxKindsApi.THLV,
        taxRate: 10,
      });

      const actual = await Localities()
        .where({ geo_code: locality.geoCode })
        .first();
      expect(actual).toMatchObject<Partial<LocalityDBO>>({
        geo_code: locality.geoCode,
        tax_kind: TaxKindsApi.THLV,
        tax_rate: 10,
      });
    });

    it('should remove the locality tax', async () => {
      await localityRepository.update({
        ...locality,
        taxRate: 10,
        taxKind: TaxKindsApi.THLV,
      });

      const { body, status } = await request(app)
        .put(testRoute(locality.geoCode))
        .send({ taxKind: TaxKindsApi.None })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<LocalityApi>>({
        geoCode: locality.geoCode,
        taxKind: TaxKindsApi.None,
      });

      const actual = await Localities()
        .where({ geo_code: locality.geoCode })
        .first();
      expect(actual).toMatchObject<Partial<LocalityDBO>>({
        geo_code: locality.geoCode,
        tax_kind: TaxKindsApi.None,
      });
    });
  });
});
