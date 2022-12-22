import request from 'supertest';
import { constants } from 'http2';
import randomstring from 'randomstring';
import { Establishment1 } from '../../database/seeds/test/001-establishments';
import { createServer } from '../server';

const { app } = createServer();

describe('Establishment controller', () => {
  describe('search', () => {
    const testRoute = (query?: string) =>
      `/api/establishments${query ? '?q=' + query : ''}`;

    it('should received a query param', async () => {
      await request(app)
        .get(testRoute())
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .get(testRoute(''))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return an empty array where no establishment is found', async () => {
      const res = await request(app)
        .get(testRoute(randomstring.generate()))
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toEqual([]);
    });

    it('should return an array with establishment found', async () => {
      const res = await request(app)
        .get(
          testRoute(
            Establishment1.name.substring(1, Establishment1.name.length - 1)
          )
        )
        .expect(constants.HTTP_STATUS_OK);

      expect(res.body).toEqual([
        {
          id: Establishment1.id,
          name: Establishment1.name,
        },
      ]);
    });
  });
});
