import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';

import { genGeoCode } from '@zerologementvacant/models/fixtures';
import db from '~/infra/database';
import { tokenProvider } from '~/test/testUtils';
import {
  formatHousingRecordApi,
  Housing,
  housingTable
} from '~/repositories/housingRepository';
import {
  genCampaignApi,
  genDatafoncierHousing,
  genDatafoncierOwner,
  genEstablishmentApi,
  genHousingApi,
  genOwnerApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import {
  formatOwnerApi,
  OwnerRecordDBO,
  Owners,
  ownerTable
} from '~/repositories/ownerRepository';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import {
  Events,
  eventsTable,
  HousingEvents,
  housingEventsTable
} from '~/repositories/eventRepository';
import { createServer } from '~/infra/server';
import { HousingApi, OccupancyKindApi } from '~/models/HousingApi';
import { HousingUpdateBody } from './housingController';
import { housingNotesTable, Notes } from '~/repositories/noteRepository';
import {
  formatHousingOwnersApi,
  HousingOwners,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';
import { DatafoncierHouses } from '~/repositories/datafoncierHousingRepository';
import { DatafoncierOwners } from '~/repositories/datafoncierOwnersRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  CampaignsHousing,
  formatCampaignHousingApi
} from '~/repositories/campaignHousingRepository';
import { faker } from '@faker-js/faker/locale/fr';
import { OwnerApi } from '~/models/OwnerApi';
import { Occupancy, OCCUPANCY_VALUES } from '@zerologementvacant/models';
import { EstablishmentApi } from '~/models/EstablishmentApi';

describe('Housing API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const anotherEstablishment = genEstablishmentApi();
  const anotherUser = genUserApi(anotherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
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

  describe('GET /housing', () => {
    const testRoute = '/api/housing';

    beforeAll(async () => {
      const housings = [
        ...Array.from({ length: 5 }, () =>
          genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
        ),
        ...Array.from({ length: 3 }, () =>
          genHousingApi(
            faker.helpers.arrayElement(anotherEstablishment.geoCodes)
          )
        )
      ];
      await Housing().insert(housings.map(formatHousingRecordApi));
      const owners = housings.map((housing) => housing.owner);
      await Owners().insert(owners.map(formatOwnerApi));
      const housingOwners = housings.flatMap((housing) => {
        return formatHousingOwnersApi(housing, [housing.owner]);
      });
      await HousingOwners().insert(housingOwners);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should forbid access to housing outside of an establishment's perimeter", async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.entities).toSatisfyAll<HousingApi>((housing) => {
        return establishment.geoCodes.includes(housing.geoCode);
      });
    });

    it('should return 200 OK', async () => {
      const { status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    describe('Filters', () => {
      const department: EstablishmentApi = {
        ...genEstablishmentApi(),
        geoCodes: faker.helpers.multiple(() => genGeoCode()),
        kind: 'DEP'
      };
      const departmentUser = genUserApi(department.id);
      const intercommunality: EstablishmentApi = {
        ...genEstablishmentApi(
          ...faker.helpers.arrayElements(department.geoCodes)
        ),
        kind: 'ME'
      };
      const intercommunalityUser = genUserApi(intercommunality.id);
      const commune: EstablishmentApi = {
        ...genEstablishmentApi(
          faker.helpers.arrayElement(intercommunality.geoCodes)
        ),
        kind: 'Commune'
      };
      const communeUser = genUserApi(commune.id);

      beforeAll(async () => {
        await Establishments().insert(
          [department, intercommunality, commune].map(formatEstablishmentApi)
        );
        await Users().insert(
          [departmentUser, intercommunalityUser, communeUser].map(formatUserApi)
        );

        const housings = department.geoCodes
          .concat(intercommunality.geoCodes)
          .concat(commune.geoCodes)
          .map((geoCode) => genHousingApi(geoCode));
        await Housing().insert(housings.map(formatHousingRecordApi));
        const owners = housings.map((housing) => housing.owner);
        await Owners().insert(owners.map(formatOwnerApi));
        const housingOwners = housings.flatMap((housing) => {
          return formatHousingOwnersApi(housing, [housing.owner]);
        });
        await HousingOwners().insert(housingOwners);
      });

      it.each([
        { user: departmentUser, establishment: department },
        { user: intercommunalityUser, establishment: intercommunality },
        { user: communeUser, establishment: commune }
      ])(
        'should use the authenticated user’s establishment to filter results',
        async ({ establishment, user }) => {
          const { body, status } = await request(app)
            .get(testRoute)
            .use(tokenProvider(user));

          expect(status).toBe(constants.HTTP_STATUS_OK);
          expect(body.entities.length).toBeGreaterThan(0);
          expect(body.entities).toSatisfyAll<HousingApi>((housing) => {
            return establishment.geoCodes.includes(housing.geoCode);
          });
        }
      );

      it('should combine the authenticated user’s establishment with the intercommunalities filter', async () => {
        const { body, status } = await request(app)
          .get(testRoute)
          .query({
            intercommunalities: [intercommunality.id]
          })
          .use(tokenProvider(departmentUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.entities.length).toBeGreaterThan(0);
        expect(body.entities).toSatisfyAll<HousingApi>((housing) => {
          return intercommunality.geoCodes.includes(housing.geoCode);
        });
        expect(body.entities).not.toSatisfyAny((housing: HousingApi) => {
          return department.geoCodes
            .filter((geoCode) => !intercommunality.geoCodes.includes(geoCode))
            .includes(housing.geoCode);
        });
      });

      it('should combine the authenticated user’s establishment with the localities filter', async () => {
        const { body, status } = await request(app)
          .get(testRoute)
          .query({
            localities: [commune.geoCodes[0]]
          })
          .use(tokenProvider(intercommunalityUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.entities.length).toBeGreaterThan(0);
        expect(body.entities).toSatisfyAll<HousingApi>((housing) => {
          return commune.geoCodes.includes(housing.geoCode);
        });
      });

      it('should remove the intercommunalities filter if the user’s establishment is not at the department level', async () => {
        const { body, status } = await request(app)
          .get(testRoute)
          .query({
            intercommunalities: [intercommunality.id]
          })
          .use(tokenProvider(communeUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.entities.length).toBeGreaterThan(0);
        expect(body.entities).toSatisfyAll<HousingApi>((housing) => {
          return commune.geoCodes.includes(housing.geoCode);
        });
      });
    });

    it('should paginate the response', async () => {
      const housings = Array.from({ length: 2 }, () =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );
      const owners = housings.map((housing) => housing.owner);
      await Promise.all([
        Housing().insert(housings.map(formatHousingRecordApi)),
        Owners().insert(owners.map(formatOwnerApi))
      ]);
      const housingOwners = housings.flatMap((housing) => {
        return formatHousingOwnersApi(housing, [housing.owner]);
      });
      await HousingOwners().insert(housingOwners);

      const { body, status } = await request(app)
        .get(testRoute)
        .query({
          paginate: true,
          page: 1,
          perPage: 1
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.entities).toHaveLength(1);
    });

    it('should sort housings by occupancy', async () => {
      const housings = OCCUPANCY_VALUES.map<HousingApi>((occupancy) => ({
        ...genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
        occupancy
      }));
      const owner = genOwnerApi();
      await Promise.all([
        Housing().insert(housings.map(formatHousingRecordApi)),
        Owners().insert(formatOwnerApi(owner))
      ]);
      const housingOwners = housings.flatMap((housing) =>
        formatHousingOwnersApi(housing, [owner])
      );
      await HousingOwners().insert(housingOwners);

      const { body, status } = await request(app)
        .get(testRoute)
        .query('sort=-occupancy')
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.entities.length).toBeGreaterThan(0);
      expect(body.entities).toBeSortedBy('occupancy', {
        descending: true,
        compare: (a: string, b: string) =>
          a.toUpperCase().localeCompare(b.toUpperCase())
      });
    });
  });

  describe('POST /housing', () => {
    const testRoute = '/api/housing';

    it('should be forbidden a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if the housing already exists', async () => {
      const housing = genHousingApi(oneOf(establishment.geoCodes));
      await Housing().insert(formatHousingRecordApi(housing));
      const payload = {
        localId: housing.localId
      };

      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CONFLICT);
    });

    it('should fail if the housing was not found in datafoncier', async () => {
      const payload = {
        localId: randomstring.generate(12)
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
        genDatafoncierOwner(datafoncierHousing.idprocpte)
      );
      await DatafoncierHouses().insert(datafoncierHousing);
      await DatafoncierOwners().insert(datafoncierOwners);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        localId: payload.localId
      });
    });

    it('should ignore owners update if they already exist', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const datafoncierOwners = Array.from({ length: 3 }, () =>
        genDatafoncierOwner(datafoncierHousing.idprocpte)
      );
      const existingOwners = datafoncierOwners.map<OwnerApi>(
        (datafoncierOwner) => {
          return {
            ...genOwnerApi(),
            idpersonne: datafoncierOwner.idpersonne
          };
        }
      );
      await Promise.all([
        DatafoncierHouses().insert(datafoncierHousing),
        DatafoncierOwners().insert(datafoncierOwners),
        Owners().insert(existingOwners.map(formatOwnerApi))
      ]);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const actualOwners = await Owners()
        .select(`${ownerTable}.*`)
        .join(
          housingOwnersTable,
          `${housingOwnersTable}.owner_id`,
          `${ownerTable}.id`
        )
        .join(
          housingTable,
          `${housingTable}.id`,
          `${housingOwnersTable}.housing_id`
        )
        .where(`${housingTable}.local_id`, datafoncierHousing.idlocal);
      expect(actualOwners.length).toBe(datafoncierOwners.length);
      expect(actualOwners).toSatisfyAll<OwnerRecordDBO>((actualOwner) => {
        return existingOwners.some((existingOwner) => {
          return existingOwner.id === actualOwner.id;
        });
      });
      const actualHousing = await Housing()
        .where({ local_id: datafoncierHousing.idlocal })
        .first();
      expect(actualHousing).toBeDefined();
    });

    it('should assign its owners', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const datafoncierOwners = Array.from({ length: 6 }, () =>
        genDatafoncierOwner(datafoncierHousing.idprocpte)
      );
      await DatafoncierHouses().insert(datafoncierHousing);
      await DatafoncierOwners().insert(datafoncierOwners);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const actual = await HousingOwners().where({
        housing_geo_code: body.geoCode,
        housing_id: body.id
      });
      expect(actual).toBeArrayOfSize(datafoncierOwners.length);
    });

    it('should create an event', async () => {
      const datafoncierHousing = genDatafoncierHousing();
      const datafoncierOwners = [
        genDatafoncierOwner(datafoncierHousing.idprocpte)
      ];
      await DatafoncierHouses().insert(datafoncierHousing);
      await DatafoncierOwners().insert(datafoncierOwners);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const event = await HousingEvents()
        .where({
          housing_geo_code: body.geoCode,
          housing_id: body.id
        })
        .join(eventsTable, 'id', 'event_id')
        .first();
      expect(event).toMatchObject({
        name: 'Création du logement',
        kind: 'Create',
        section: 'Situation',
        category: 'Followup',
        created_by: user.id
      });
    });
  });

  describe('POST /housing/{id}', () => {
    const validBody: { housingUpdate: HousingUpdateBody } = {
      housingUpdate: {
        statusUpdate: {
          status: HousingStatusApi.InProgress,
          vacancyReasons: [randomstring.generate()]
        },
        occupancyUpdate: {
          occupancy: Occupancy.VACANT,
          occupancyIntended: Occupancy.DEMOLISHED_OR_DIVIDED
        },
        note: {
          content: randomstring.generate(),
          noteKind: randomstring.generate()
        }
      }
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
      status: HousingStatusApi.Waiting
    };
    const payload = {
      filters: {
        status: HousingStatusApi.Waiting,
        campaignIds: [campaign.id]
      },
      housingIds: [housing.id],
      allHousing: false,
      housingUpdate: {
        statusUpdate: {
          status: HousingStatusApi.InProgress,
          vacancyReasons: [randomstring.generate()]
        },
        occupancyUpdate: {
          occupancy: OccupancyKindApi.Vacant,
          occupancyIntended: OccupancyKindApi.DemolishedOrDivided
        },
        note: {
          content: randomstring.generate()
        }
      }
    };

    beforeAll(async () => {
      await Campaigns().insert(formatCampaignApi(campaign));
      await Housing().insert(formatHousingRecordApi(housing));
      await CampaignsHousing().insert(
        formatCampaignHousingApi(campaign, [housing])
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
        housingIds: [randomstring.generate()]
      });
      await badRequestTest({
        ...payload,
        filters: {
          ...payload.filters,
          campaignIds: [randomstring.generate()]
        }
      });
      await badRequestTest({ ...payload, housingUpdate: undefined });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          statusUpdate: {
            ...payload.housingUpdate.statusUpdate,
            status: undefined
          }
        }
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          statusUpdate: {
            ...payload.housingUpdate.statusUpdate,
            status: randomstring.generate()
          }
        }
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          occupancyUpdate: {
            ...payload.housingUpdate.occupancyUpdate,
            occupancy: null
          }
        }
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          occupancyUpdate: {
            ...payload.housingUpdate.occupancyUpdate,
            occupancy: randomstring.generate()
          }
        }
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          occupancyUpdate: {
            ...payload.housingUpdate.occupancyUpdate,
            occupancyIntended: randomstring.generate()
          }
        }
      });
      await badRequestTest({
        ...payload,
        housingUpdate: {
          ...payload.housingUpdate,
          note: {
            ...payload.housingUpdate.note,
            content: undefined
          }
        }
      });
    });

    it('should be forbidden to set status "NeverContacted" for a list of housing which one has already been contacted', async () => {
      const { status } = await request(app)
        .post(testRoute)
        .send({
          ...payload,
          filters: {
            status: HousingStatusApi.Waiting
          },
          housingUpdate: {
            statusUpdate: {
              status: HousingStatusApi.NeverContacted
            }
          }
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
            payload.housingUpdate.occupancyUpdate.occupancyIntended
        }
      ]);

      const actual = await Housing().where('id', housing.id).first();
      expect(actual).toMatchObject({
        id: housing.id,
        status: payload.housingUpdate.statusUpdate.status,
        occupancy: payload.housingUpdate.occupancyUpdate.occupancy,
        occupancy_intended:
          payload.housingUpdate.occupancyUpdate.occupancyIntended
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
                created_by: user.id
              })
            ])
          )
        );

      await request(app)
        .post(testRoute)
        .send({
          ...payload,
          currentStatus: payload.housingUpdate.statusUpdate.status
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
          housing_id: housing.id
        });
      expect(actual).toIncludeAllPartialMembers([
        {
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          name: "Modification du statut d'occupation",
          kind: 'Update',
          category: 'Followup',
          section: 'Situation',
          created_by: user.id
        }
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
        created_by: user.id
      });
    });
  });
});
