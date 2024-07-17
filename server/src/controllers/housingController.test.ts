import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';

import db from '~/infra/database';
import { tokenProvider } from '~/test/testUtils';
import {
  formatHousingRecordApi,
  Housing,
} from '~/repositories/housingRepository';
import {
  genCampaignApi,
  genDatafoncierHousing,
  genDatafoncierOwner,
  genEstablishmentApi,
  genHousingApi,
  genOwnerApi,
  genUserApi,
  oneOf,
} from '~/test/testFixtures';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import {
  Events,
  eventsTable,
  HousingEvents,
  housingEventsTable,
} from '~/repositories/eventRepository';
import { createServer } from '~/infra/server';
import { HousingApi, OccupancyKindApi } from '~/models/HousingApi';
import { HousingUpdateBody } from './housingController';
import { housingNotesTable, Notes } from '~/repositories/noteRepository';
import {
  formatHousingOwnersApi,
  HousingOwners,
} from '~/repositories/housingOwnerRepository';
import { DatafoncierHouses } from '~/repositories/datafoncierHousingRepository';
import { DatafoncierOwners } from '~/repositories/datafoncierOwnersRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import {
  Campaigns,
  formatCampaignApi,
} from '~/repositories/campaignRepository';
import {
  CampaignsHousing,
  formatCampaignHousingApi,
} from '~/repositories/campaignHousingRepository';

describe('Housing API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const anotherEstablishment = genEstablishmentApi();
  const anotherUser = genUserApi(anotherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi),
    );
    await Users().insert([user, anotherUser].map(formatUserApi));
  });

  describe('GET /housing/{id}', () => {
    const testRoute = (id: string) => `/api/housing/${id}`;

    const housing = genHousingApi(oneOf(anotherEstablishment.geoCodes));

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
    });

    it("should forbid access to housing outside of an establishment's perimeter", async () => {
      const { status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('POST /housing', () => {
    const testRoute = '/api/housing';

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should forbid access to housing outside of an establishment's perimeter", async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          filters: {},
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.entities).toSatisfyAll<HousingApi>((housing) => {
        return establishment.geoCodes.includes(housing.geoCode);
      });
    });

    it('should return the housing list for a query filter', async () => {
      const queriedHousing = {
        ...genHousingApi(oneOf(establishment.geoCodes)),
        rawAddress: ['line1 with   many      spaces', 'line2'],
      };
      await Housing().insert(formatHousingRecordApi(queriedHousing));
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(
        formatHousingOwnersApi(queriedHousing, [owner]),
      );

      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          page: 1,
          perPage: 10,
          filters: { query: 'line1   with many spaces' },
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
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

  describe('POST /housing/creation', () => {
    const testRoute = '/api/housing/creation';

    it('should be forbidden a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if the housing already exists', async () => {
      const housing = genHousingApi(oneOf(establishment.geoCodes));
      await Housing().insert(formatHousingRecordApi(housing));
      const payload = {
        localId: housing.localId,
      };

      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CONFLICT);
    });

    it('should fail if the housing was not found in datafoncier', async () => {
      const payload = {
        localId: randomstring.generate(12),
      };

      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a housing', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const datafoncierOwners = Array.from({ length: 3 }, () =>
        genDatafoncierOwner(datafoncierHousing.idprocpte),
      );
      await DatafoncierHouses().insert(datafoncierHousing);
      await DatafoncierOwners().insert(datafoncierOwners);
      const payload = {
        localId: datafoncierHousing.idlocal,
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        localId: payload.localId,
      });
    });

    it('should assign its owners', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const datafoncierOwners = Array.from({ length: 6 }, () =>
        genDatafoncierOwner(datafoncierHousing.idprocpte),
      );
      await DatafoncierHouses().insert(datafoncierHousing);
      await DatafoncierOwners().insert(datafoncierOwners);
      const payload = {
        localId: datafoncierHousing.idlocal,
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const actual = await HousingOwners().where({
        housing_geo_code: body.geoCode,
        housing_id: body.id,
      });
      expect(actual).toBeArrayOfSize(datafoncierOwners.length);
    });

    it('should create an event', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const datafoncierOwners = [
        genDatafoncierOwner(datafoncierHousing.idprocpte),
      ];
      await DatafoncierHouses().insert(datafoncierHousing);
      await DatafoncierOwners().insert(datafoncierOwners);
      const payload = {
        localId: datafoncierHousing.idlocal,
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const event = await HousingEvents()
        .where({
          housing_geo_code: body.geoCode,
          housing_id: body.id,
        })
        .join(eventsTable, 'id', 'event_id')
        .first();
      expect(event).toMatchObject({
        name: 'Ajout du logement dans la base',
        kind: 'Create',
        section: 'Situation',
        category: 'Followup',
        created_by: user.id,
      });
    });
  });

  describe('POST /housing/{id}', () => {
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

    const housing = genHousingApi(oneOf(establishment.geoCodes));

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid housingId', async () => {
      const { status } = await request(app)
        .post(testRoute(randomstring.generate()))
        .send(validBody)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    // All the others tests are covered by updateHousingList one's
  });

  describe('POST /housing/list', () => {
    const testRoute = '/api/housing/list';

    const campaign = genCampaignApi(establishment.id, user.id);
    const housing: HousingApi = {
      ...genHousingApi(oneOf(establishment.geoCodes)),
      status: HousingStatusApi.Waiting,
    };
    const payload = {
      filters: {
        status: HousingStatusApi.Waiting,
        campaignIds: [campaign.id],
      },
      housingIds: [housing.id],
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

    beforeAll(async () => {
      await Campaigns().insert(formatCampaignApi(campaign));
      await Housing().insert(formatHousingRecordApi(housing));
      await CampaignsHousing().insert(
        formatCampaignHousingApi(campaign, [housing]),
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid request', async () => {
      const badRequestTest = async (payload?: Record<string, unknown>) => {
        const { status } = await request(app)
          .post(testRoute)
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      };

      await badRequestTest();
      await badRequestTest({ ...payload, housingIds: undefined });
      await badRequestTest({
        ...payload,
        housingIds: [randomstring.generate()],
      });
      await badRequestTest({
        ...payload,
        filters: {
          ...payload.filters,
          campaignIds: [randomstring.generate()],
        },
      });
      await badRequestTest({ ...payload, housingUpdate: undefined });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          statusUpdate: {
            ...payload.housingUpdate.statusUpdate,
            status: undefined,
          },
        },
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          statusUpdate: {
            ...payload.housingUpdate.statusUpdate,
            status: randomstring.generate(),
          },
        },
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          occupancyUpdate: {
            ...payload.housingUpdate.occupancyUpdate,
            occupancy: null,
          },
        },
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          occupancyUpdate: {
            ...payload.housingUpdate.occupancyUpdate,
            occupancy: randomstring.generate(),
          },
        },
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          occupancyUpdate: {
            ...payload.housingUpdate.occupancyUpdate,
            occupancyIntended: randomstring.generate(),
          },
        },
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          note: {
            ...payload.housingUpdate.note,
            content: undefined,
          },
        },
      });
    });

    it('should be forbidden to set status "NeverContacted" for a list of housing which one has already been contacted', async () => {
      const { status } = await request(app)
        .post(testRoute)
        .send({
          ...payload,
          filters: {
            status: HousingStatusApi.Waiting,
          },
          housingUpdate: {
            statusUpdate: {
              status: HousingStatusApi.NeverContacted,
            },
          },
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should update the housing list and return the updated result', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      expect(body).toIncludeAllPartialMembers([
        {
          id: housing.id,
          status: payload.housingUpdate.statusUpdate.status,
          occupancy: payload.housingUpdate.occupancyUpdate.occupancy,
          occupancyIntended:
            payload.housingUpdate.occupancyUpdate.occupancyIntended,
        },
      ]);

      const actual = await Housing().where('id', housing.id).first();
      expect(actual).toMatchObject({
        id: housing.id,
        status: payload.housingUpdate.statusUpdate.status,
        occupancy: payload.housingUpdate.occupancyUpdate.occupancy,
        occupancy_intended:
          payload.housingUpdate.occupancyUpdate.occupancyIntended,
      });
    });

    it('should create and event related to the status change only when there are some changes', async () => {
      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      await db(eventsTable)
        .join(housingEventsTable, 'event_id', 'id')
        .where('housing_id', housing.id)
        .andWhere('name', 'Changement de statut de suivi')
        .then((result) =>
          expect(result).toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                housing_id: housing.id,
                name: 'Changement de statut de suivi',
                kind: 'Update',
                category: 'Followup',
                section: 'Situation',
                created_by: user.id,
              }),
            ]),
          ),
        );

      await request(app)
        .post(testRoute)
        .send({
          ...payload,
          currentStatus: payload.housingUpdate.statusUpdate.status,
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_OK);

      await db(eventsTable)
        .join(housingEventsTable, 'event_id', 'id')
        .where('housing_id', housing.id)
        .andWhere('name', 'Changement de statut de suivi')
        .count()
        .first()
        .then((result) => expect(result?.count).toBe('1'));
    });

    it('should create an event related to the occupancy change', async () => {
      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await Events()
        .join(housingEventsTable, 'event_id', 'id')
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
        });
      expect(actual).toIncludeAllPartialMembers([
        {
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          name: "Modification du statut d'occupation",
          kind: 'Update',
          category: 'Followup',
          section: 'Situation',
          created_by: user.id,
        },
      ]);
    });

    it('should create a note', async () => {
      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await Notes()
        .join(housingNotesTable, 'note_id', 'id')
        .where('housing_id', housing.id)
        .first();
      expect(actual).toMatchObject({
        housing_id: housing.id,
        ...payload.housingUpdate.note,
        created_by: user.id,
      });
    });
  });
});
