import { v4 as uuidv4 } from 'uuid';
import db from '../repositories/db';
import request from 'supertest';
import randomstring from 'randomstring';
import { constants } from 'http2';
import { genOwnerProspectApi } from '../test/testFixtures';
import { createServer } from '../server';
import fetchMock from 'jest-fetch-mock';
import ownerProspectRepository, {
  ownerProspectsTable,
} from '../repositories/ownerProspectRepository';
import { withAccessToken } from '../test/testUtils';
import {
  Locality1,
  Locality2,
} from '../../database/seeds/test/001-establishments';
import { OwnerProspectApi } from '../models/OwnerProspectApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import {
  OwnerProspect1,
  OwnerProspect2,
} from '../../database/seeds/test/010-owner-prospects';

describe('Owner prospect controller', () => {
  const { app } = createServer();

  beforeEach(() => {
    fetchMock.resetMocks();
  });

  describe('create', () => {
    const testRoute = '/api/owner-prospects';

    it('should received a valid owner prospect', async () => {
      const ownerProspect = genOwnerProspectApi();

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
          address: undefined,
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
      const ownerProspect = OwnerProspect1;
      const { body, status } = await request(app)
        .post(testRoute)
        .send(ownerProspect);

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        ...ownerProspect,
        createdAt: expect.any(String),
        id: expect.any(String),
      });

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

  describe('find', () => {
    const testRoute = '/api/owner-prospects';

    const ownerProspects: OwnerProspectApi[] = [
      genOwnerProspectApi(Locality1.geoCode),
      genOwnerProspectApi(Locality1.geoCode),
      genOwnerProspectApi(Locality2.geoCode),
    ];
    const expectedCount = [OwnerProspect1, ...ownerProspects.slice(0, 2)]
      .length;

    beforeEach(async () => {
      await Promise.all(ownerProspects.map(ownerProspectRepository.insert));
    });

    it('should receive valid query parameters', async () => {
      await withAccessToken(
        request(app).get(testRoute).query({
          sort: '-email,address,123',
        })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list owner prospects by establishment', async () => {
      const { body, status } = await withAccessToken(
        request(app).get(testRoute)
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<PaginatedResultApi<OwnerProspectApi>>>(
        {
          page: 1,
          perPage: 25,
          filteredCount: expectedCount,
          totalCount: expectedCount,
        }
      );
      expect(body.entities).toHaveLength(expectedCount);
      const inEstablishment = body.entities.every(
        (entity: OwnerProspectApi) => entity.geoCode === Locality1.geoCode
      );
      expect(inEstablishment).toBe(true);
    });

    it('should return 206 Partial Content if the page does not include all records', async () => {
      const { body, status } = await withAccessToken(
        request(app).get(testRoute).query({
          perPage: 1,
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
      expect(body).toMatchObject<Partial<PaginatedResultApi<OwnerProspectApi>>>(
        {
          totalCount: expectedCount,
          filteredCount: 1,
          page: 1,
          perPage: 1,
        }
      );
      expect(body.entities).toHaveLength(1);
    });
  });

  describe('update', () => {
    const testRoute = (id: string) => `/api/owner-prospects/${id}`;

    it('should receive a valid payload', async () => {
      await withAccessToken(
        request(app).put(testRoute(OwnerProspect1.id)).send({
          callBack: '123',
        })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it("should be forbidden to update another locality's owner prospect", async () => {
      const { status } = await withAccessToken(
        request(app).put(testRoute(OwnerProspect2.id)).send({
          callBack: true,
          read: false,
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update only the allowed attributes', async () => {
      const { body, status } = await withAccessToken(
        request(app).put(testRoute(OwnerProspect1.id)).send({
          id: uuidv4(),
          callBack: !OwnerProspect1.callBack,
          read: true,
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({
        ...OwnerProspect1,
        createdAt: OwnerProspect1.createdAt.toJSON(),
        callBack: !OwnerProspect1.callBack,
        read: true,
      });
    });
  });
});
