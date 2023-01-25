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

const { app } = createServer();

describe('Locality controller', () => {
  describe('getLocality', () => {
    const testRoute = (geoCode: string) => `/api/localities/${geoCode}`;

    it('should received valid parameters', async () => {
      await request(app)
        .get(testRoute('id'))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be missing', async () => {
      await request(app)
        .get(testRoute(genGeoCode()))
        .expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should retrieve the locality', async () => {
      const res = await request(app)
        .get(testRoute(Locality1.geoCode))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.objectContaining({
          name: Locality1.name,
          geoCode: Locality1.geoCode,
        })
      );
    });
  });

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
      await withAccessToken(request(app).put(testRoute(Locality2.geoCode)))
        .send({ taxRate: 10 })
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be missing', async () => {
      await withAccessToken(
        request(app).put(testRoute(genGeoCode())).send({ taxRate: 10 })
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
    });

    it('should be a locality in zone C', async () => {
      await withAccessToken(request(app).put(testRoute(Locality2.geoCode)))
        .send({ taxRate: 10 })
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should update the locality tax rate', async () => {
      await withAccessToken(request(app).put(testRoute(Locality1.geoCode)))
        .send({ taxRate: 10 })
        .expect(constants.HTTP_STATUS_OK);

      await localityRepository.get(Locality1.geoCode).then((result) => {
        expect(result).toMatchObject(
          expect.objectContaining({
            geoCode: Locality1.geoCode,
            taxRate: 10,
          })
        );
      });
    });

    it('should remove the locality tax', async () => {
      await localityRepository.update({ ...Locality1, taxRate: 10 });

      await withAccessToken(request(app).put(testRoute(Locality1.geoCode)))
        .send({})
        .expect(constants.HTTP_STATUS_OK);

      await localityRepository.get(Locality1.geoCode).then((result) => {
        expect(result).toMatchObject(
          expect.objectContaining({
            taxRate: null,
          })
        );
      });
    });
  });
});
