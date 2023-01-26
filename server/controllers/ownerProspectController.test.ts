import db from '../repositories/db';
import request from 'supertest';
import randomstring from 'randomstring';
import { constants } from 'http2';
import { genOwnerProspectApi } from '../test/testFixtures';
import { createServer } from '../server';
import fetchMock from 'jest-fetch-mock';
import { ownerProspectsTable } from '../repositories/ownerProspectRepository';

const { app } = createServer();

describe('Owner prospect controller', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  describe('createOwnerProspect', () => {
    const testRoute = '/api/owner-prospects';
    const ownerProspect = genOwnerProspectApi();

    it('should received a valid owner prospect', async () => {
      await request(app)
        .post(testRoute)
        .send({
          ...ownerProspect,
          email: randomstring.generate(),
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...ownerProspect,
          email: undefined,
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...ownerProspect,
          firstName: undefined,
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...ownerProspect,
          lastName: undefined,
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...ownerProspect,
          address: undefined,
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...ownerProspect,
          geoCode: undefined,
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .post(testRoute)
        .send({
          ...ownerProspect,
          phone: undefined,
        })
        .expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should create a new owner prospect', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send(ownerProspect);

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject(ownerProspect);

      await db(ownerProspectsTable)
        .where('email', ownerProspect.email)
        .first()
        .then((result) => {
          expect(result).toEqual(
            expect.objectContaining({
              email: ownerProspect.email,
              first_name: ownerProspect.firstName,
              last_name: ownerProspect.lastName,
              address: ownerProspect.address,
              geo_code: ownerProspect.geoCode,
              phone: ownerProspect.phone,
            })
          );
        });
    });
  });
});
