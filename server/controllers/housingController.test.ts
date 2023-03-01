import db from '../repositories/db';
import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import housingRepository, {
  housingTable,
} from '../repositories/housingRepository';
import { genHousingApi } from '../test/testFixtures';
import { Locality1 } from '../../database/seeds/test/001-establishments';
import { Owner1 } from '../../database/seeds/test/004-owner';
import ownerRepository from '../repositories/ownerRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import randomstring from 'randomstring';
import { Campaign1 } from '../../database/seeds/test/006-campaigns';
import { Housing1 } from '../../database/seeds/test/005-housing';
import { eventsTable } from '../repositories/eventRepository';
import { EventKinds } from '../models/EventApi';
import { User1 } from '../../database/seeds/test/003-users';
import { campaignsHousingTable } from '../repositories/campaignHousingRepository';
import { createServer } from '../server';

const { app } = createServer();

describe('Housing controller', () => {
  describe('list', () => {
    const testRoute = '/api/housing';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return the housing list for a query filter', async () => {
      const queriedHousing = {
        ...genHousingApi(Locality1.geoCode),
        rawAddress: ['line1 with   many      spaces', 'line2'],
      };

      await db(housingTable).insert(
        housingRepository.formatHousingApi(queriedHousing)
      );

      await ownerRepository.insertHousingOwners([
        { ...Owner1, housingId: queriedHousing.id, rank: 1 },
      ]);

      const res = await withAccessToken(request(app).post(testRoute))
        .send({
          page: 1,
          perPage: 10,
          filters: { query: 'line1   with many spaces' },
        })
        .expect(constants.HTTP_STATUS_OK);

      expect(res.status).toBe(constants.HTTP_STATUS_OK);
      expect(res.body).toMatchObject({
        entities: expect.arrayContaining([
          expect.objectContaining({
            id: queriedHousing.id,
          }),
        ]),
        page: 1,
        perPage: 10,
        filteredCount: 1,
        totalCount: 4,
      });
    });
  });

  describe('updateHousing', () => {
    const validBody = {
      housingUpdate: {
        status: HousingStatusApi.InProgress,
        contactKind: 'Appel entrant',
        comment: randomstring.generate(),
      },
    };

    const testRoute = (housingId: string) => `/api/housing/${housingId}`;

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .post(testRoute(Housing1.id))
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid housingId', async () => {
      await withAccessToken(
        request(app).post(testRoute(randomstring.generate())).send(validBody)
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should received a valid housingUpdate object', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute(Housing1.id))
          .send({ ...validBody, housingUpdate: undefined })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute(Housing1.id))
          .send({
            ...validBody,
            housingUpdate: { ...validBody.housingUpdate, status: undefined },
          })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute(Housing1.id))
          .send({
            ...validBody,
            housingUpdate: {
              ...validBody.housingUpdate,
              status: randomstring.generate(),
            },
          })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute(Housing1.id))
          .send({
            ...validBody,
            housingUpdate: {
              ...validBody.housingUpdate,
              contactKind: undefined,
            },
          })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should update the housing and return the updated result', async () => {
      const res = await withAccessToken(
        request(app).post(testRoute(Housing1.id)).send(validBody)
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            id: Housing1.id,
            status: validBody.housingUpdate.status,
          }),
        ])
      );

      await db(housingTable)
        .where('id', Housing1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              id: Housing1.id,
              status: validBody.housingUpdate.status,
            })
          )
        );
    });

    it('should create and event related to the status change', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute(Housing1.id))
          .send({ ...validBody })
      ).expect(constants.HTTP_STATUS_OK);

      await db(eventsTable)
        .where('housing_id', Housing1.id)
        .andWhere('campaign_id', Campaign1.id)
        .andWhere('owner_id', Owner1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              housing_id: Housing1.id,
              owner_id: Owner1.id,
              campaign_id: Campaign1.id,
              kind: String(EventKinds.StatusChange),
              contact_kind: validBody.housingUpdate.contactKind,
              created_by: User1.id,
              content:
                'Passage à Suivi en cours. ' + validBody.housingUpdate.comment,
            })
          )
        );
    });

    it('should remove housing from campaign when updating to status NeverContacted', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute(Housing1.id))
          .send({
            ...validBody,
            housingUpdate: {
              ...validBody.housingUpdate,
              status: HousingStatusApi.NeverContacted,
            },
          })
      ).expect(constants.HTTP_STATUS_OK);

      await db(campaignsHousingTable)
        .where('housing_id', Housing1.id)
        .andWhere('campaign_id', Campaign1.id)
        .first()
        .then((result) => expect(result).toBeUndefined());
    });
  });

  describe('updateHousingList', () => {
    const validBody = {
      currentStatus: HousingStatusApi.Waiting,
      campaignIds: [Campaign1.id],
      housingIds: [Housing1.id],
      housingUpdate: {
        status: HousingStatusApi.InProgress,
        contactKind: 'Appel entrant',
        comment: randomstring.generate(),
      },
    };

    const testRoute = '/api/housing/list';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid housing ids array', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody, housingIds: undefined })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody, housingIds: [randomstring.generate()] })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should received a valid campaign ids array', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody, campaignIds: undefined })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody, campaignIds: [randomstring.generate()] })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should received a valid current status', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody, currentStatus: undefined })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody, currentStatus: randomstring.generate() })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should received a valid housingUpdate object', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody, housingUpdate: undefined })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...validBody,
            housingUpdate: { ...validBody.housingUpdate, status: undefined },
          })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...validBody,
            housingUpdate: {
              ...validBody.housingUpdate,
              status: randomstring.generate(),
            },
          })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);

      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...validBody,
            housingUpdate: {
              ...validBody.housingUpdate,
              contactKind: undefined,
            },
          })
      ).expect(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should update the housing list and return the updated result', async () => {
      const res = await withAccessToken(
        request(app).post(testRoute).send(validBody)
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            id: Housing1.id,
            status: validBody.housingUpdate.status,
          }),
        ])
      );

      await db(housingTable)
        .where('id', Housing1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              id: Housing1.id,
              status: validBody.housingUpdate.status,
            })
          )
        );
    });

    it('should create and event related to the status change', async () => {
      await withAccessToken(
        request(app).post(testRoute).send(validBody)
      ).expect(constants.HTTP_STATUS_OK);

      await db(eventsTable)
        .where('housing_id', Housing1.id)
        .andWhere('campaign_id', Campaign1.id)
        .andWhere('owner_id', Owner1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              housing_id: Housing1.id,
              owner_id: Owner1.id,
              campaign_id: Campaign1.id,
              kind: String(EventKinds.StatusChange),
              contact_kind: validBody.housingUpdate.contactKind,
              created_by: User1.id,
              content:
                'Passage à Suivi en cours. ' + validBody.housingUpdate.comment,
            })
          )
        );
    });

    it('should remove housing from campaign when updating to status NeverContacted', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...validBody,
            housingUpdate: {
              ...validBody.housingUpdate,
              status: HousingStatusApi.NeverContacted,
            },
          })
      ).expect(constants.HTTP_STATUS_OK);

      await db(campaignsHousingTable)
        .where('housing_id', Housing1.id)
        .andWhere('campaign_id', Campaign1.id)
        .first()
        .then((result) => expect(result).toBeUndefined());
    });
  });
});
