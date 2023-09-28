import db from '../repositories/db';
import request from 'supertest';
import { withAccessToken } from '../test/testUtils';
import { constants } from 'http2';
import housingRepository, {
  housingTable,
} from '../repositories/housingRepository';
import { genHousingApi } from '../test/testFixtures';
import {
  Establishment1,
  Locality1,
} from '../../database/seeds/test/001-establishments';
import { Owner1 } from '../../database/seeds/test/004-owner';
import ownerRepository from '../repositories/ownerRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import randomstring from 'randomstring';
import { Campaign1 } from '../../database/seeds/test/006-campaigns';
import { Housing1 } from '../../database/seeds/test/005-housing';
import {
  eventsTable,
  housingEventsTable,
} from '../repositories/eventRepository';
import { User1, User2 } from '../../database/seeds/test/003-users';
import { campaignsHousingTable } from '../repositories/campaignHousingRepository';
import { createServer } from '../server';
import { HousingApi, OccupancyKindApi } from '../models/HousingApi';
import { HousingEvent1 } from '../../database/seeds/test/011-events';
import { HousingUpdateBody } from './housingController';
import { housingNotesTable, notesTable } from '../repositories/noteRepository';

const { app } = createServer();

describe('Housing controller', () => {
  describe('get', () => {
    const testRoute = (id: string) => `/api/housing/${id}`;

    it("should forbid access to housing outside of an establishment's perimeter", async () => {
      // Forbidden
      await withAccessToken(
        request(app).get(testRoute(Housing1.id)),
        User2
      ).expect(constants.HTTP_STATUS_NOT_FOUND);

      // Allowed
      await withAccessToken(
        request(app).get(testRoute(Housing1.id)),
        User1
      ).expect(constants.HTTP_STATUS_OK);
    });
  });

  describe('list', () => {
    const testRoute = '/api/housing';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should forbid access to housing outside of an establishment's perimeter", async () => {
      const { body, status } = await withAccessToken(
        request(app).post(testRoute).send({
          filters: {},
        })
      );

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const allowedHousing = body.entities.every((housing: HousingApi) =>
        Establishment1.geoCodes.includes(housing.geoCode)
      );
      expect(allowedHousing).toBe(true);
    });

    it('should return the housing list for a query filter', async () => {
      const queriedHousing = {
        ...genHousingApi(Locality1.geoCode),
        rawAddress: ['line1 with   many      spaces', 'line2'],
      };

      await db(housingTable).insert(
        housingRepository.formatHousingRecordApi(queriedHousing)
      );

      await ownerRepository.insertHousingOwners([
        {
          ...Owner1,
          housingId: queriedHousing.id,
          housingGeoCode: queriedHousing.geoCode,
          rank: 1,
        },
      ]);

      const res = await withAccessToken(request(app).post(testRoute)).send({
        page: 1,
        perPage: 10,
        filters: { query: 'line1   with many spaces' },
      });

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
        totalCount: 0,
      });
    });
  });

  describe('updateHousing', () => {
    const validBody: { housingUpdate: HousingUpdateBody } = {
      housingUpdate: {
        statusUpdate: {
          status: HousingStatusApi.InProgress,
          vacancyReasons: [randomstring.generate()],
        },
        occupancyUpdate: {
          occupancy: OccupancyKindApi.Vacant,
          occupancyIntended: OccupancyKindApi.DemolishedOrDivided,
        },
        note: {
          content: randomstring.generate(),
          noteKind: randomstring.generate(),
        },
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

    // All the others tests are covered by updateHousingList one's
  });

  describe('updateHousingList', () => {
    const validBody = {
      filters: {
        status: HousingStatusApi.Waiting,
        campaignIds: [Campaign1.id],
      },
      housingIds: [Housing1.id],
      allHousing: false,
      housingUpdate: {
        statusUpdate: {
          status: HousingStatusApi.InProgress,
          vacancyReasons: [randomstring.generate()],
        },
        occupancyUpdate: {
          occupancy: OccupancyKindApi.Vacant,
          occupancyIntended: OccupancyKindApi.DemolishedOrDivided,
        },
        note: {
          content: randomstring.generate(),
        },
      },
    };

    const testRoute = '/api/housing/list';

    it('should be forbidden for a not authenticated user', async () => {
      await request(app)
        .post(testRoute)
        .expect(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid request', async () => {
      const badRequestTest = async (payload?: Record<string, unknown>) => {
        await withAccessToken(
          request(app)
            .post(testRoute)
            .send(payload)
            .expect(constants.HTTP_STATUS_BAD_REQUEST)
        );
      };

      await badRequestTest();
      await badRequestTest({ ...validBody, housingIds: undefined });
      await badRequestTest({
        ...validBody,
        housingIds: [randomstring.generate()],
      });
      await badRequestTest({
        ...validBody,
        filters: {
          ...validBody.filters,
          campaignIds: [randomstring.generate()],
        },
      });
      await badRequestTest({ ...validBody, housingUpdate: undefined });
      await badRequestTest({
        ...validBody,
        housingUpdate: {
          ...validBody.housingUpdate,
          statusUpdate: {
            ...validBody.housingUpdate.statusUpdate,
            status: undefined,
          },
        },
      });
      await badRequestTest({
        ...validBody,
        housingUpdate: {
          ...validBody.housingUpdate,
          statusUpdate: {
            ...validBody.housingUpdate.statusUpdate,
            status: randomstring.generate(),
          },
        },
      });
      await badRequestTest({
        ...validBody,
        housingUpdate: {
          ...validBody.housingUpdate,
          occupancyUpdate: {
            ...validBody.housingUpdate.occupancyUpdate,
            occupancy: randomstring.generate(),
          },
        },
      });
      await badRequestTest({
        ...validBody,
        housingUpdate: {
          ...validBody.housingUpdate,
          occupancyUpdate: {
            ...validBody.housingUpdate.occupancyUpdate,
            occupancyIntended: randomstring.generate(),
          },
        },
      });
      await badRequestTest({
        ...validBody,
        housingUpdate: {
          ...validBody.housingUpdate,
          note: {
            ...validBody.housingUpdate.note,
            content: undefined,
          },
        },
      });
    });

    it('should update the housing list and return the updated result', async () => {
      const res = await withAccessToken(
        request(app).post(testRoute).send(validBody)
      ).expect(constants.HTTP_STATUS_OK);

      expect(res.body).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            id: Housing1.id,
            status: validBody.housingUpdate.statusUpdate.status,
            occupancy: validBody.housingUpdate.occupancyUpdate.occupancy,
            occupancyIntended:
              validBody.housingUpdate.occupancyUpdate.occupancyIntended,
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
              status: validBody.housingUpdate.statusUpdate.status,
              occupancy: validBody.housingUpdate.occupancyUpdate.occupancy,
              occupancy_intended:
                validBody.housingUpdate.occupancyUpdate.occupancyIntended,
            })
          )
        );
    });

    it('should create and event related to the status change only when there are some changes', async () => {
      await withAccessToken(
        request(app).post(testRoute).send(validBody)
      ).expect(constants.HTTP_STATUS_OK);

      await db(eventsTable)
        .join(housingEventsTable, 'event_id', 'id')
        .where('housing_id', Housing1.id)
        .andWhere('name', 'Changement de statut de suivi')
        .then((result) =>
          expect(result).toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                housing_id: Housing1.id,
                name: 'Changement de statut de suivi',
                kind: 'Update',
                category: 'Followup',
                section: 'Situation',
                created_by: User1.id,
              }),
            ])
          )
        );

      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({
            ...validBody,
            currentStatus: validBody.housingUpdate.statusUpdate.status,
          })
      ).expect(constants.HTTP_STATUS_OK);

      await db(eventsTable)
        .join(housingEventsTable, 'event_id', 'id')
        .where('housing_id', Housing1.id)
        .andWhere('name', 'Changement de statut de suivi')
        .count()
        .first()
        .then((result) => expect(result?.count).toBe('1'));
    });

    it('should create and event related to the occupancy change', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody })
      ).expect(constants.HTTP_STATUS_OK);

      await db(eventsTable)
        .join(housingEventsTable, 'event_id', 'id')
        .where('housing_id', Housing1.id)
        .andWhereNot('id', HousingEvent1.id)
        .then((result) =>
          expect(result).toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                housing_id: Housing1.id,
                name: "Modification du statut d'occupation",
                kind: 'Update',
                category: 'Followup',
                section: 'Situation',
                created_by: User1.id,
              }),
            ])
          )
        );
    });

    it('should create a note', async () => {
      await withAccessToken(
        request(app)
          .post(testRoute)
          .send({ ...validBody })
      ).expect(constants.HTTP_STATUS_OK);

      await db(notesTable)
        .join(housingNotesTable, 'note_id', 'id')
        .where('housing_id', Housing1.id)
        .first()
        .then((result) =>
          expect(result).toMatchObject(
            expect.objectContaining({
              housing_id: Housing1.id,
              ...validBody.housingUpdate.note,
              created_by: User1.id,
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
              statusUpdate: {
                status: HousingStatusApi.NeverContacted,
              },
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
