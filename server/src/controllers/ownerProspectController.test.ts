import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import db from '~/infra/database';
import {
  genEstablishmentApi,
  genLocalityApi,
  genOwnerProspectApi,
  genUserApi,
} from '~/test/testFixtures';
import { createServer } from '~/infra/server';
import {
  formatOwnerProspectApi,
  OwnerProspects,
  ownerProspectsTable,
} from '~/repositories/ownerProspectRepository';
import { tokenProvider } from '~/test/testUtils';
import { OwnerProspectApi } from '~/models/OwnerProspectApi';
import { PaginatedResultApi } from '~/models/PaginatedResultApi';
import {
  formatLocalityApi,
  Localities,
} from '~/repositories/localityRepository';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';

describe('Owner prospect controller', () => {
  const { app } = createServer();

  const locality = genLocalityApi();
  const anotherLocality = genLocalityApi();
  const establishment = genEstablishmentApi(locality.geoCode);
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Localities().insert(
      [locality, anotherLocality].map(formatLocalityApi),
    );
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('POST /owner-prospects', () => {
    const testRoute = '/api/owner-prospects';

    const ownerProspect = genOwnerProspectApi(locality.geoCode);

    beforeAll(async () => {
      await OwnerProspects().insert(formatOwnerProspectApi(ownerProspect));
    });

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
            }),
          );
        });
    });
  });

  describe('GET /owner-prospects', () => {
    const testRoute = '/api/owner-prospects';

    const ownerProspects: OwnerProspectApi[] = [
      genOwnerProspectApi(locality.geoCode),
      genOwnerProspectApi(locality.geoCode),
      genOwnerProspectApi(anotherLocality.geoCode),
    ];

    beforeAll(async () => {
      await OwnerProspects().insert(ownerProspects.map(formatOwnerProspectApi));
    });

    it('should receive valid query parameters', async () => {
      const { status } = await request(app)
        .get(testRoute)
        .query({
          sort: '-email,address,123',
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list owner prospects by establishment', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.entities).toSatisfyAll<OwnerProspectApi>((actual) => {
        return establishment.geoCodes.includes(actual.geoCode);
      });
    });

    it('should return 206 Partial Content if the page does not include all records', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .query({
          perPage: 1,
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_PARTIAL_CONTENT);
      expect(body).toMatchObject<Partial<PaginatedResultApi<OwnerProspectApi>>>(
        {
          filteredCount: 1,
          page: 1,
          perPage: 1,
        },
      );
      expect(body.entities).toHaveLength(1);
    });
  });

  describe('PUT /owner-prospects/{id}', () => {
    const testRoute = (id: string) => `/api/owner-prospects/${id}`;

    let ownerProspect: OwnerProspectApi;
    let anotherOwnerProspect: OwnerProspectApi;

    beforeEach(async () => {
      ownerProspect = genOwnerProspectApi(locality.geoCode);
      anotherOwnerProspect = genOwnerProspectApi(anotherLocality.geoCode);
      await OwnerProspects().insert(
        [ownerProspect, anotherOwnerProspect].map(formatOwnerProspectApi),
      );
    });

    it('should receive a valid payload', async () => {
      const { status } = await request(app)
        .put(testRoute(ownerProspect.id))
        .send({
          callBack: '123',
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it("should be forbidden to update another locality's owner prospect", async () => {
      const { status } = await request(app)
        .put(testRoute(anotherOwnerProspect.id))
        .send({
          callBack: true,
          read: false,
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update only the allowed attributes', async () => {
      const { body, status } = await request(app)
        .put(testRoute(ownerProspect.id))
        .send({
          id: uuidv4(),
          callBack: !ownerProspect.callBack,
          read: true,
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual({
        ...ownerProspect,
        createdAt: ownerProspect.createdAt.toJSON(),
        callBack: !ownerProspect.callBack,
        read: true,
      });
    });
  });
});
