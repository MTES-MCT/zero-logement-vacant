import { fc, test } from '@fast-check/jest';

import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  CAMPAIGN_COUNT_VALUES,
  DATA_FILE_YEAR_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  GroupDTO,
  GroupPayloadDTO,
  HOUSING_BY_BUILDING_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  LIVING_AREA_VALUES,
  LOCALITY_KIND_VALUES,
  OCCUPANCY_VALUES,
  OWNER_AGE_VALUES,
  OWNER_KIND_VALUES,
  OWNERSHIP_KIND_VALUES,
  ROOM_COUNT_VALUES,
  VACANCY_RATE_VALUES,
  VACANCY_YEAR_VALUES
} from '@zerologementvacant/models';
import { wait } from '@zerologementvacant/utils';
import async from 'async';
import { constants } from 'http2';
import fp from 'lodash/fp';
import request from 'supertest';
import config from '~/infra/config';
import db from '~/infra/database';
import { createServer } from '~/infra/server';
import { CampaignApi } from '~/models/CampaignApi';
import { EventApi } from '~/models/EventApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { OwnerApi } from '~/models/OwnerApi';
import { toUserDTO } from '~/models/UserApi';
import campaignRepository, {
  Campaigns
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EventRecordDBO,
  Events,
  eventsTable,
  GroupHousingEvents,
  groupHousingEventsTable,
  parseEventApi
} from '~/repositories/eventRepository';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing,
  groupsHousingTable
} from '~/repositories/groupRepository';
import {
  formatHousingOwnersApi,
  HousingOwnerDBO,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genOwnerApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Group API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const otherEstablishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const otherUser = genUserApi(otherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, otherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert([user, otherUser].map(formatUserApi));
  });

  describe('GET /groups', () => {
    const testRoute = '/api/groups';

    const groups = [
      genGroupApi(user, establishment),
      genGroupApi(user, establishment),
      genGroupApi(otherUser, otherEstablishment)
    ];

    beforeAll(async () => {
      await Groups().insert(groups.map(formatGroupApi));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute);
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should list housing groups in the authenticated user's establishment", async () => {
      const establishmentGroups = groups.filter(
        (group) => group.establishmentId === establishment.id
      );

      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const groupIds = establishmentGroups.map(fp.pick(['id']));
      expect(body).toIncludeAllPartialMembers(groupIds);
    });
  });

  describe('GET /groups/{id}', () => {
    const testRoute = (id: string): string => `/api/groups/${id}`;
    const group = genGroupApi(user, establishment);
    const anotherGroup = genGroupApi(otherUser, otherEstablishment);

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(group.id));
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await request(app)
        .get(testRoute(anotherGroup.id))
        .use(tokenProvider(otherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it("should return a housing group in the authenticated user's establishment", async () => {
      const { body, status } = await request(app)
        .get(testRoute(group.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: group.id
      });
    });
  });

  describe('POST /groups', () => {
    const testRoute = '/api/groups';
    const owner = genOwnerApi();
    const housingList = [
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(otherEstablishment.geoCodes[0])
    ];
    const payload: GroupPayloadDTO = {
      title: 'Logements prioritaires',
      description: 'Logements les plus énergivores',
      housing: {
        all: false,
        ids: housingList.map((housing) => housing.id),
        filters: {}
      }
    };

    beforeAll(async () => {
      await Owners().insert(formatOwnerApi(owner));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const ownersHousing = housingList.map<HousingOwnerDBO>((housing) => ({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1
      }));
      await HousingOwners().insert(ownersHousing);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute).send(payload).set({
        'Content-Type': 'application/json'
      });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should create a group with all the housing belonging to the given establishment', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<GroupDTO>({
        id: expect.any(String),
        title: payload.title,
        description: payload.description,
        housingCount: 2,
        ownerCount: 1,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(user),
        archivedAt: null
      });
    });

    test.prop<GroupPayloadDTO>({
      title: fc.stringMatching(/\S/),
      description: fc.stringMatching(/\S/),
      housing: fc.record({
        all: fc.boolean(),
        ids: fc.array(fc.uuid()),
        filters: fc.record({
          housingIds: fc.array(fc.uuid()),
          occupancies: fc.array(fc.constantFrom(...OCCUPANCY_VALUES)),
          energyConsumption: fc.array(
            fc.constantFrom(...ENERGY_CONSUMPTION_VALUES)
          ),
          establishmentIds: fc.array(fc.uuid()),
          groupIds: fc.array(fc.uuid()),
          campaignsCounts: fc.array(fc.constantFrom(...CAMPAIGN_COUNT_VALUES)),
          campaignIds: fc.array(fc.oneof(fc.constant(null), fc.uuid())),
          ownerIds: fc.array(fc.uuid()),
          ownerKinds: fc.array(fc.constantFrom(...OWNER_KIND_VALUES)),
          ownerAges: fc.array(fc.constantFrom(...OWNER_AGE_VALUES)),
          multiOwners: fc.array(fc.boolean()),
          beneficiaryCounts: fc.array(
            fc.constantFrom(...BENEFIARY_COUNT_VALUES)
          ),
          housingKinds: fc.array(fc.constantFrom(...HOUSING_KIND_VALUES)),
          housingAreas: fc.array(fc.constantFrom(...LIVING_AREA_VALUES)),
          roomsCounts: fc.array(fc.constantFrom(...ROOM_COUNT_VALUES)),
          cadastralClassifications: fc.array(
            fc.constantFrom(...CADASTRAL_CLASSIFICATION_VALUES)
          ),
          buildingPeriods: fc.array(fc.constantFrom(...BUILDING_PERIOD_VALUES)),
          vacancyYears: fc.array(fc.constantFrom(...VACANCY_YEAR_VALUES)),
          isTaxedValues: fc.array(fc.boolean()),
          ownershipKinds: fc.array(fc.constantFrom(...OWNERSHIP_KIND_VALUES)),
          housingCounts: fc.array(
            fc.constantFrom(...HOUSING_BY_BUILDING_VALUES)
          ),
          vacancyRates: fc.array(fc.constantFrom(...VACANCY_RATE_VALUES)),
          intercommunalities: fc.array(fc.uuid({ version: 4 })),
          localities: fc.array(fc.string({ minLength: 5, maxLength: 5 })),
          localityKinds: fc.array(fc.constantFrom(...LOCALITY_KIND_VALUES)),
          geoPerimetersIncluded: fc.array(fc.string({ minLength: 1 })),
          geoPerimetersExcluded: fc.array(fc.string({ minLength: 1 })),
          dataFileYearsIncluded: fc.array(
            fc.constantFrom(...DATA_FILE_YEAR_VALUES)
          ),
          dataFileYearsExcluded: fc.array(
            fc.constantFrom(...DATA_FILE_YEAR_VALUES)
          ),
          status: fc.constantFrom(...HOUSING_STATUS_VALUES),
          statusList: fc.array(fc.constantFrom(...HOUSING_STATUS_VALUES)),
          subStatus: fc.array(fc.string({ minLength: 1 })),
          query: fc.string()
        })
      })
    })('should validate the request payload', async (payload) => {
      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should create a group with all the housing corresponding to the given criteria', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          ...payload,
          housing: {
            all: true,
            ids: [],
            filters: {
              status: HousingStatus.FIRST_CONTACT
            }
          }
        } as GroupPayloadDTO)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const housings = await Housing().whereExists((subquery) => {
        subquery
          .select('*')
          .from(groupsHousingTable)
          .where({
            group_id: body.id,
            housing_id: db.ref(`${housingTable}.id`),
            housing_geo_code: db.ref(`${housingTable}.geo_code`)
          });
      });
      expect(housings).toSatisfyAll<HousingRecordDBO>((housing) => {
        return housing.status === HousingStatusApi.FirstContact;
      });
      expect(body).toStrictEqual<GroupDTO>({
        id: expect.any(String),
        title: payload.title,
        description: payload.description,
        housingCount: expect.toBeNumber(),
        ownerCount: expect.toBeNumber(),
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(user),
        archivedAt: null
      });
    });

    it('should create events related to the group and its housing', async () => {
      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));
      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      await wait(1000);
      const establishmentHousingList = housingList.filter((housing) =>
        establishment.geoCodes.includes(housing.geoCode)
      );
      const events = await Events()
        .join(
          groupHousingEventsTable,
          `${groupHousingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where('group_id', body.id)
        .then((events) => events.map(parseEventApi) as EventApi<GroupApi>[]);
      expect(events).toBeArrayOfSize(establishmentHousingList.length);
      expect(events).toIncludeAllPartialMembers(
        establishmentHousingList.map(() => ({
          name: 'Ajout dans un groupe',
          kind: 'Create',
          category: 'Group',
          section: 'Ajout d’un logement dans un groupe',
          conflict: false,
          createdBy: user.id
        }))
      );
    });

    it('should create the group immediately and add housing later if the volume of housing exceeds the threshold', async () => {
      const housingList = Array.from({
        length: config.app.batchSize * 2
      }).map(() => genHousingApi(oneOf(establishment.geoCodes)));
      await async.forEach(
        fp.chunk(config.app.batchSize, housingList),
        async (chunk) => {
          await Housing().insert(chunk.map(formatHousingRecordApi));
        }
      );
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(
        housingList.flatMap((housing) =>
          formatHousingOwnersApi(housing, [owner])
        )
      );

      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          ...payload,
          housing: {
            all: true,
            ids: [],
            filters: {}
          }
        } as GroupPayloadDTO)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_ACCEPTED);
      expect(body).toMatchObject<Partial<GroupDTO>>({
        id: expect.any(String),
        title: payload.title,
        description: payload.description,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(user),
        archivedAt: null
      });
    });
  });

  describe('PUT /groups/{id}', () => {
    const testRoute = (id: string) => `/api/groups/${id}`;
    const group = genGroupApi(user, establishment);
    const anotherGroup = genGroupApi(otherUser, otherEstablishment);
    const housingList = [
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(otherEstablishment.geoCodes[0])
    ];

    const payload: GroupPayloadDTO = {
      title: 'Logement prioritaires',
      description: 'Logements les plus énergivores',
      housing: {
        all: false,
        ids: housingList.map((housing) => housing.id),
        filters: {}
      }
    };

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
      await Groups().insert(formatGroupApi(anotherGroup));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app)
        .put(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await request(app)
        .put(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(otherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be hidden if the group has been archived', async () => {
      const group: GroupApi = {
        ...genGroupApi(user, establishment),
        archivedAt: new Date()
      };
      await Groups().insert(formatGroupApi(group));

      const { status } = await request(app)
        .put(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update a group', async () => {
      const { body, status } = await request(app)
        .put(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<GroupDTO>({
        id: group.id,
        title: payload.title,
        description: payload.description,
        housingCount: group.housingCount,
        ownerCount: group.ownerCount,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(user),
        archivedAt: group.archivedAt?.toJSON() ?? null
      });
    });
  });

  describe('POST /groups/{id}/housing', () => {
    const testRoute = (id: string) => `/api/groups/${id}/housing`;
    const owner = genOwnerApi();
    const housingList = [
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(otherEstablishment.geoCodes[0])
    ];
    const establishmentHousingList = housingList.filter((housing) =>
      establishment.geoCodes.includes(housing.geoCode)
    );
    const group = genGroupApi(user, establishment);

    const payload: GroupPayloadDTO['housing'] = {
      all: false,
      ids: housingList.map((housing) => housing.id),
      filters: {}
    };

    beforeAll(async () => {
      await Owners().insert(formatOwnerApi(owner));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const ownersHousing = housingList.map<HousingOwnerDBO>((housing) => ({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1
      }));
      await HousingOwners().insert(ownersHousing);
      await Groups().insert(formatGroupApi(group));
      await GroupsHousing().insert(
        formatGroupHousingApi(group, establishmentHousingList)
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app)
        .post(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await request(app)
        .post(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(otherUser));
      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be hidden if the group has been archived', async () => {
      const group: GroupApi = {
        ...genGroupApi(user, establishment),
        archivedAt: new Date()
      };

      const { status } = await request(app)
        .post(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should add the housing corresponding to the given criteria to the group', async () => {
      const housing = genHousingApi(oneOf(establishment.geoCodes));
      await Housing().insert(formatHousingRecordApi(housing));
      await HousingOwners().insert({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1
      });

      const { body, status } = await request(app)
        .post(testRoute(group.id))
        .send({
          all: false,
          ids: [housing.id],
          filters: {}
        } as GroupPayloadDTO['housing'])
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<GroupDTO>({
        id: group.id,
        title: group.title,
        description: group.description,
        housingCount: establishmentHousingList.length + 1,
        ownerCount: 1,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(user),
        archivedAt: group.archivedAt?.toJSON() ?? null
      });
    });

    it('should create events when some housing get added', async () => {
      const housing = genHousingApi(oneOf(establishment.geoCodes));
      await Housing().insert(formatHousingRecordApi(housing));
      await HousingOwners().insert({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1
      });

      const { body, status } = await request(app)
        .post(testRoute(group.id))
        .send({
          all: false,
          ids: [housing.id],
          filters: {}
        } as GroupPayloadDTO['housing'])
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      await wait(1000);
      const events = await Events()
        .join(
          groupHousingEventsTable,
          `${groupHousingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where('group_id', body.id);
      expect(events).toIncludeAllPartialMembers([
        {
          name: 'Ajout dans un groupe',
          kind: 'Create',
          category: 'Group',
          section: 'Ajout d’un logement dans un groupe',
          conflict: false,
          created_by: user.id
        }
      ]);
    });
  });

  describe('DELETE /groups/{id}/housing', () => {
    const testRoute = (id: string) => `/api/groups/${id}/housing`;
    const owner = genOwnerApi();
    const housingList = [
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(establishment.geoCodes[0]),
      genHousingApi(otherEstablishment.geoCodes[0])
    ];
    const establishmentHousingList = housingList.filter((housing) =>
      establishment.geoCodes.includes(housing.geoCode)
    );
    const group = genGroupApi(user, establishment);

    const payload: GroupPayloadDTO['housing'] = {
      all: false,
      ids: housingList.slice(2, 3).map((housing) => housing.id),
      filters: {}
    };

    beforeAll(async () => {
      await Owners().insert(formatOwnerApi(owner));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      const ownersHousing = housingList.map<HousingOwnerDBO>((housing) => ({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1
      }));
      await HousingOwners().insert(ownersHousing);
      await Groups().insert(formatGroupApi(group));
      await GroupsHousing().insert(
        formatGroupHousingApi(group, establishmentHousingList)
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app)
        .delete(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await request(app)
        .delete(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(otherUser));
      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be hidden if the group has been archived', async () => {
      const group: GroupApi = {
        ...genGroupApi(user, establishment),
        archivedAt: new Date()
      };
      await Groups().insert(formatGroupApi(group));

      const { status } = await request(app)
        .post(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should remove the housing corresponding to the given criteria to the group', async () => {
      const { body, status } = await request(app)
        .delete(testRoute(group.id))
        .send({
          all: false,
          ids: [establishmentHousingList[0].id],
          filters: {}
        } as GroupPayloadDTO['housing'])
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toStrictEqual<GroupDTO>({
        id: group.id,
        title: group.title,
        description: group.description,
        housingCount: establishmentHousingList.length - 1,
        ownerCount: 1,
        createdAt: expect.toBeDateString(),
        createdBy: toUserDTO(user),
        archivedAt: group.archivedAt?.toJSON() ?? null
      });
    });

    it('should create events when some housing get removed', async () => {
      const { body, status } = await request(app)
        .delete(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      await wait(1000);
      const events = await Events()
        .join(
          groupHousingEventsTable,
          `${groupHousingEventsTable}.event_id`,
          `${eventsTable}.id`
        )
        .where('group_id', body.id);
      expect(events).toIncludeAllPartialMembers(
        payload.ids.map((housingId) => ({
          name: 'Retrait d’un groupe',
          kind: 'Delete',
          category: 'Group',
          section: 'Retrait du logement d’un groupe',
          conflict: false,
          created_by: user.id,
          housing_id: housingId
        }))
      );
    });
  });

  describe('DELETE /groups/{id}', () => {
    const testRoute = (id: string): string => `/api/groups/${id}`;

    let group: GroupApi;
    let anotherGroup: GroupApi;
    let housingList: HousingApi[];
    let owner: OwnerApi;

    beforeEach(async () => {
      group = genGroupApi(user, establishment);
      anotherGroup = genGroupApi(otherUser, otherEstablishment);
      housingList = Array.from({ length: 3 }).map(() =>
        genHousingApi(oneOf(establishment.geoCodes))
      );
      owner = genOwnerApi();

      await Groups().insert(formatGroupApi(group));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      await Owners().insert(formatOwnerApi(owner));
      await GroupsHousing().insert(formatGroupHousingApi(group, housingList));
      const ownersHousing = housingList.map<HousingOwnerDBO>((housing) => ({
        owner_id: owner.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
        rank: 1
      }));
      await HousingOwners().insert(ownersHousing);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).delete(testRoute(group.id));
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be hidden for a user outside of the establishment', async () => {
      const { status } = await request(app)
        .delete(testRoute(anotherGroup.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should remove a group', async () => {
      const { status } = await request(app)
        .delete(testRoute(group.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should create events when a group is removed', async () => {
      // TODO
    });

    describe('If a campaign was created from the group', () => {
      let campaign: CampaignApi;

      beforeEach(async () => {
        campaign = {
          ...genCampaignApi(establishment.id, user.id),
          groupId: group.id
        };
        await Campaigns().insert(
          campaignRepository.formatCampaignApi(campaign)
        );
      });

      it('should archive a group', async () => {
        const { body, status } = await request(app)
          .delete(testRoute(group.id))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject({
          archivedAt: expect.any(String)
        });
      });

      it('should create events when the group is archived', async () => {
        const { status } = await request(app)
          .delete(testRoute(group.id))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        await wait(1000);
        const actual = await GroupHousingEvents()
          .whereNull('group_id')
          .join(
            eventsTable,
            `${eventsTable}.id`,
            `${groupHousingEventsTable}.event_id`
          );
        expect(actual).toSatisfy<EventRecordDBO<GroupApi>[]>((events) => {
          return events.some(
            (event) => event.section === 'Archivage d’un groupe'
          );
        });
      });
    });
  });
});
