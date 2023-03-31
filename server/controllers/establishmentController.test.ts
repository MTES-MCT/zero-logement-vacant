import request from 'supertest';
import { constants } from 'http2';
import randomstring from 'randomstring';
import {
  Establishment1,
  Establishment2,
  Locality1,
  Locality2,
} from '../../database/seeds/test/001-establishments';
import { createServer } from '../server';

const { app } = createServer();

describe('Establishment controller', () => {
  describe('list', () => {
    const testRoute = (queryParams?: string[]) =>
      `/api/establishments${
        queryParams?.length ? '?' + queryParams.join('&&') : ''
      }`;

    it('should received at least a query param', async () => {
      await request(app)
        .get(testRoute())
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .get(testRoute([]))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should received valid query params', async () => {
      await request(app)
        .get(testRoute([`query=`]))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .get(
          testRoute([`geoCodes=${Locality1.geoCode}`, `geoCodes=1232456789`])
        )
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .get(testRoute([`available=available`]))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return an empty array where no establishment is found', async () => {
      const res = await request(app)
        .get(testRoute([`query=${randomstring.generate()}`]))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toEqual([]);
    });

    it('should list available establishments', async () => {
      const res = await request(app)
        .get(testRoute(['available=true']))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: Establishment1.id,
            name: Establishment1.name,
          }),
          expect.objectContaining({
            id: Establishment2.id,
            name: Establishment2.name,
          }),
        ])
      );
    });

    it('should search by query', async () => {
      const res = await request(app)
        .get(
          testRoute([
            `query=${Establishment1.name.substring(
              1,
              Establishment1.name.length - 1
            )}`,
          ])
        )
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toEqual([
        expect.objectContaining({
          id: Establishment1.id,
          name: Establishment1.name,
        }),
      ]);
    });

    it('should list by geo code', async () => {
      const res = await request(app)
        .get(
          testRoute([
            `geoCodes=${Locality1.geoCode}`,
            `geoCodes=${Locality2.geoCode}`,
          ])
        )
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: Establishment1.id,
            name: Establishment1.name,
          }),
          expect.objectContaining({
            id: Establishment2.id,
            name: Establishment2.name,
          }),
        ])
      );
    });
  });
});
