import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import {
  Locality1,
  Locality2,
} from '../../database/seeds/test/001-establishments';
import { createServer } from '../server';
import { genGeoCode } from '../test/testFixtures';
import localityRepository from '../repositories/localityRepository';
import { TaxKindsApi } from '../models/LocalityApi';

const { app } = createServer();

describe('Locality controller', () => {
  describe('listLocalities', () => {
    const testRoute = '/api/localities';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .get(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list the localities for the authenticated user', async () => {
      const res = await withAccessToken(request(app).get(testRoute)).expect(
        constants.HTTP_STATUS_OK
      );

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            name: Locality1.name,
            geoCode: Locality1.geoCode,
          }),
        ])
      );
      expect(res.body).not.toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            name: Locality2.name,
          }),
        ])
      );
    });
  });

  describe('updateLocalityTax', () => {
    const testRoute = (geoCode?: string) =>
      `/api/localities${geoCode ? '/' + geoCode : ''}/tax`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .put(testRoute(Locality1.geoCode))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be forbidden for a user from another establishment', async () => {
      console.log('route', testRoute(Locality2.geoCode));
      await withAccessToken(request(app).put(testRoute(Locality2.geoCode)))
        .send({ taxKind: TaxKindsApi.THLV, taxRate: 10 })
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be missing', async () => {
      await withAccessToken(
        request(app)
          .put(testRoute(String(genGeoCode())))
          .send({ taxKind: TaxKindsApi.THLV, taxRate: 10 })
      ).expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received valid parameters', async () => {
      await withAccessToken(request(app).put(testRoute())).expect(
        constants.HTTP_STATUS_NOT_FOUND
      );

      await withAccessToken(request(app).put(testRoute('id'))).expect(
        constants.HTTP_STATUS_BAD_REQUEST
      );

      await withAccessToken(request(app).put(testRoute(Locality1.geoCode)))
        .send({ taxRate: 'a' })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(request(app).put(testRoute(Locality1.geoCode)))
        .send({ taxKind: TaxKindsApi.TLV, taxRate: 10 })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(request(app).put(testRoute(Locality1.geoCode)))
        .send({ taxKind: TaxKindsApi.THLV })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(request(app).put(testRoute(Locality1.geoCode)))
        .send({ taxKind: TaxKindsApi.None, taxRate: 10 })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be a locality without TLV', async () => {
      await withAccessToken(request(app).put(testRoute(Locality2.geoCode)))
        .send({ taxKind: TaxKindsApi.THLV, taxRate: 10 })
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should update the locality tax rate', async () => {
      await withAccessToken(request(app).put(testRoute(Locality1.geoCode)))
        .send({ taxKind: TaxKindsApi.THLV, taxRate: 10 })
        .expect(constants.HTTP_STATUS_OK);

      await localityRepository.get(Locality1.geoCode).then((result) => {
        expect(result).toMatchObject(
          expect.objectContaining({
            geoCode: Locality1.geoCode,
            taxKind: TaxKindsApi.THLV,
            taxRate: 10,
          })
        );
      });
    });

    it('should remove the locality tax', async () => {
      await localityRepository.update({
        ...Locality1,
        taxRate: 10,
        taxKind: TaxKindsApi.THLV,
      });

      await withAccessToken(request(app).put(testRoute(Locality1.geoCode)))
        .send({ taxKind: TaxKindsApi.None })
        .expect(constants.HTTP_STATUS_OK);

      await localityRepository.get(Locality1.geoCode).then((result) => {
        expect(result).toMatchObject(
          expect.objectContaining({
            taxKind: TaxKindsApi.None,
            taxRate: null,
          })
        );
      });
    });
  });
});
