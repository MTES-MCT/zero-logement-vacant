import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
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
  OWNER_RANKS,
  OWNERSHIP_KIND_VALUES,
  ROOM_COUNT_VALUES,
  VACANCY_RATE_VALUES,
  VACANCY_YEAR_VALUES
} from '@zerologementvacant/models';
import { genGeoCode } from '@zerologementvacant/models/fixtures';
import type { Selectable } from 'kysely';
import fp from 'lodash/fp';
import request from 'supertest';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { OwnerApi } from '~/models/OwnerApi';
import { toUserDTO, UserApi } from '~/models/UserApi';
import { toEstablishmentInsert } from '~/repositories/establishmentRepository';
import { toUserInsert } from '~/repositories/userRepository';
import { factories } from '~/test/factories';
import {
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Group API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let otherEstablishment: EstablishmentApi;
  let user: UserApi;
  let otherUser: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    otherEstablishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
    otherUser = await factories.user.create({
      establishmentId: otherEstablishment.id
    });
  });

  describe('GET /groups', () => {
    const testRoute = '/groups';

    let groups: GroupApi[];

    beforeAll(async () => {
      groups = await Promise.all([
        factories
          .group(establishment)
          .create({}, { associations: { createdBy: user } }),
        factories
          .group(establishment)
          .create({}, { associations: { createdBy: user } }),
        factories
          .group(otherEstablishment)
          .create({}, { associations: { createdBy: otherUser } })
      ]);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute);
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should list housing groups in the authenticated user's establishment", async () => {
      const establishmentGroups = groups.filter(
        (group) => group.establishmentId === establishment.id
      );

      const { body, status } = await request(url)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const groupIds = establishmentGroups.map(fp.pick(['id']));
      expect(body).toIncludeAllPartialMembers(groupIds);
    });
  });

  describe('GET /groups/{id}', () => {
    const testRoute = (id: string): string => `/groups/${id}`;

    let group: GroupApi;
    let anotherGroup: GroupApi;

    beforeAll(async () => {
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      anotherGroup = genGroupApi(otherUser, otherEstablishment);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(group.id));
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await request(url)
        .get(testRoute(anotherGroup.id))
        .use(tokenProvider(otherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it("should return a housing group in the authenticated user's establishment", async () => {
      const { body, status } = await request(url)
        .get(testRoute(group.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: group.id
      });
    });

    describe('validation', () => {
      it('should return 400 when :id is not a UUID', async () => {
        const { status, body } = await request(url)
          .get(testRoute('not-a-uuid'))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({ name: 'ValidationError' });
        expect(body.message).toMatch(/id/i);
      });
    });
  });

  describe('POST /groups', () => {
    const testRoute = '/groups';

    let owners: OwnerApi[];
    let housings: HousingApi[];

    const basePayload = {
      title: 'Logements prioritaires',
      description: 'Logements les plus énergivores'
    };

    beforeAll(async () => {
      owners = await factories.owner.createList(3);
      housings = await Promise.all(
        Array.from({ length: 10 }, () =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement([
              ...establishment.geoCodes,
              ...otherEstablishment.geoCodes
            ])
          })
        )
      );
      await Promise.all(
        housings.flatMap((housing) => {
          const randomRanks = faker.helpers.arrayElements(OWNER_RANKS);
          const randomOwners = faker.helpers.arrayElements(
            owners,
            randomRanks.length
          );
          return randomOwners.map((owner, index) =>
            factories
              .housingOwner({ housing, owner })
              .create({ rank: randomRanks[index] })
          );
        })
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const payload: GroupPayloadDTO = {
        ...basePayload,
        housing: {
          all: true,
          ids: [],
          filters: {}
        }
      };

      const { status } = await request(url).post(testRoute).send(payload).set({
        'Content-Type': 'application/json'
      });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should create a group with all the housing belonging to the given establishment', async () => {
      const payload: GroupPayloadDTO = {
        ...basePayload,
        housing: {
          all: true,
          ids: [],
          filters: {
            establishmentIds: [establishment.id]
          }
        }
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const housings = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', body.id)
        .execute();
      const owners = await kysely
        .selectFrom('ownersHousing')
        .select('ownerId')
        .distinctOn('ownerId')
        .where((eb) =>
          eb(
            eb.refTuple('housingGeoCode', 'housingId'),
            'in',
            housings.map((housing) =>
              eb.tuple(housing.housingGeoCode, housing.housingId)
            )
          )
        )
        .where('rank', '=', 1)
        .execute();
      expect(body).toStrictEqual<GroupDTO>({
        id: expect.any(String),
        title: payload.title,
        description: payload.description,
        housingCount: housings.length,
        ownerCount: owners.length,
        createdAt: expect.any(String),
        createdBy: toUserDTO(user),
        archivedAt: null
      });
    });

    test.prop<GroupPayloadDTO>(
      {
        title: fc.stringMatching(/\S/),
        description: fc.stringMatching(/\S/),
        housing: fc.record({
          all: fc.boolean(),
          ids: fc.array(fc.uuid({ version: 4 })),
          filters: fc.record({
            housingIds: fc.array(fc.uuid({ version: 4 })),
            occupancies: fc.array(fc.constantFrom(...OCCUPANCY_VALUES)),
            energyConsumption: fc.array(
              fc.constantFrom(...ENERGY_CONSUMPTION_VALUES)
            ),
            establishmentIds: fc.array(fc.uuid({ version: 4 })),
            groupIds: fc.array(fc.uuid({ version: 4 })),
            campaignsCounts: fc.array(
              fc.constantFrom(...CAMPAIGN_COUNT_VALUES)
            ),
            campaignIds: fc.array(
              fc.oneof(fc.constant(null), fc.uuid({ version: 4 }))
            ),
            ownerIds: fc.array(fc.uuid({ version: 4 })),
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
            buildingPeriods: fc.array(
              fc.constantFrom(...BUILDING_PERIOD_VALUES)
            ),
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
            query: fc.stringMatching(/[a-zA-Z0-9-]/)
          })
        })
      },
      { numRuns: 20 }
    )('should validate the request payload', async (payload) => {
      const { status } = await request(url)
        .post(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should create a group with all the housing corresponding to the given criteria', async () => {
      const payload: GroupPayloadDTO = {
        ...basePayload,
        housing: {
          all: true,
          ids: [],
          filters: {
            status: HousingStatus.FIRST_CONTACT
          }
        }
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const housings = await kysely
        .selectFrom('fastHousing')
        .innerJoin('groupsHousing', (join) =>
          join
            .onRef('groupsHousing.housingId', '=', 'fastHousing.id')
            .onRef('groupsHousing.housingGeoCode', '=', 'fastHousing.geoCode')
        )
        .selectAll('fastHousing')
        .where('groupsHousing.groupId', '=', body.id)
        .execute();
      expect(housings).toSatisfyAll<Selectable<DB['fastHousing']>>(
        (housing) => {
          return housing.status === HousingStatus.FIRST_CONTACT;
        }
      );
      expect(body).toStrictEqual<GroupDTO>({
        id: expect.any(String),
        title: payload.title,
        description: payload.description,
        housingCount: expect.any(Number),
        ownerCount: expect.any(Number),
        createdAt: expect.any(String),
        createdBy: toUserDTO(user),
        archivedAt: null
      });
    });

    it('should create a group with ownerless housings too', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });

      const payload: GroupPayloadDTO = {
        ...basePayload,
        housing: {
          all: false,
          ids: [...housings.map((housing) => housing.id), housing.id],
          filters: {}
        }
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const groupHousing = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', body.id)
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .executeTakeFirst();
      expect(groupHousing).toBeDefined();
    });

    it('should create events related to the group and its housing', async () => {
      const payload: GroupPayloadDTO = {
        ...basePayload,
        housing: {
          all: true,
          ids: [],
          filters: {}
        }
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));
      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const groupHousings = await kysely
        .selectFrom('groupsHousing')
        .selectAll('groupsHousing')
        .where('groupId', '=', body.id)
        .execute();
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'groupHousingEvents',
          'groupHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('groupHousingEvents.groupId', '=', body.id)
        .where('events.type', '=', 'housing:group-attached')
        .execute();
      expect(events).toBeArrayOfSize(groupHousings.length);
      events.forEach((event) => {
        expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
          type: 'housing:group-attached',
          nextOld: null,
          nextNew: { name: payload.title },
          createdBy: user.id
        });
      });
    });

    describe('Geo scope', () => {
      const scopedEstablishment: EstablishmentApi = genEstablishmentApi(
        genGeoCode(),
        genGeoCode()
      );
      const scopedUser = genUserApi(scopedEstablishment.id);
      const intercommunality: EstablishmentApi = {
        ...genEstablishmentApi(scopedEstablishment.geoCodes[0]),
        kind: 'METRO'
      };

      beforeAll(async () => {
        await kysely
          .insertInto('establishments')
          .values(
            [scopedEstablishment, intercommunality].map(toEstablishmentInsert)
          )
          .execute();
        await kysely
          .insertInto('users')
          .values(toUserInsert(scopedUser))
          .execute();
      });

      it('should only include housing within the intercommunalities filter', async () => {
        const [insideHousing, outsideHousing] = await Promise.all([
          factories.housing.create({ geoCode: intercommunality.geoCodes[0] }),
          factories.housing.create({
            geoCode: scopedEstablishment.geoCodes[1]
          })
        ]);

        const payload: GroupPayloadDTO = {
          ...basePayload,
          housing: {
            all: true,
            ids: [],
            filters: { intercommunalities: [intercommunality.id] }
          }
        };

        const { body, status } = await request(url)
          .post(testRoute)
          .send(payload)
          .set({ 'Content-Type': 'application/json' })
          .use(tokenProvider(scopedUser));

        expect(status).toBe(constants.HTTP_STATUS_CREATED);
        const groupHousings = await kysely
          .selectFrom('groupsHousing')
          .selectAll('groupsHousing')
          .where('groupId', '=', body.id)
          .execute();
        expect(groupHousings.map((row) => row.housingId)).toInclude(
          insideHousing.id
        );
        expect(groupHousings.map((row) => row.housingId)).not.toInclude(
          outsideHousing.id
        );
      });
    });
  });

  describe('PUT /groups/{id}', () => {
    const testRoute = (id: string) => `/groups/${id}`;

    let group: GroupApi;
    let housingList: HousingApi[];
    let payload: GroupPayloadDTO;

    beforeAll(async () => {
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      await factories
        .group(otherEstablishment)
        .create({}, { associations: { createdBy: otherUser } });
      housingList = [
        genHousingApi(establishment.geoCodes[0]),
        genHousingApi(establishment.geoCodes[0]),
        genHousingApi(establishment.geoCodes[0]),
        genHousingApi(otherEstablishment.geoCodes[0])
      ];
      payload = {
        title: 'Logement prioritaires',
        description: 'Logements les plus énergivores',
        housing: {
          all: false,
          ids: housingList.map((housing) => housing.id),
          filters: {}
        }
      };
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .put(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await request(url)
        .put(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(otherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be hidden if the group has been archived', async () => {
      const group = await factories
        .group(establishment)
        .create(
          { archivedAt: new Date() },
          { associations: { createdBy: user } }
        );

      const { status } = await request(url)
        .put(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should update a group', async () => {
      const { body, status } = await request(url)
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
        createdAt: expect.any(String),
        createdBy: toUserDTO(user),
        archivedAt: group.archivedAt?.toJSON() ?? null
      });
    });

    describe('validation', () => {
      it('should return 400 when body.title is missing', async () => {
        const { status, body: responseBody } = await request(url)
          .put(testRoute(group.id))
          .send({
            description: 'Some description',
            housing: { all: false, ids: [], filters: {} }
          })
          .set({ 'Content-Type': 'application/json' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(responseBody).toMatchObject({ name: 'ValidationError' });
        expect(responseBody.message).toMatch(/titre|title/i);
      });

      it('should return 400 when body.description is missing', async () => {
        const { status, body: responseBody } = await request(url)
          .put(testRoute(group.id))
          .send({
            title: 'Some title',
            housing: { all: false, ids: [], filters: {} }
          })
          .set({ 'Content-Type': 'application/json' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(responseBody).toMatchObject({ name: 'ValidationError' });
      });

      it('should return 400 when :id is not a UUID', async () => {
        const { status, body: responseBody } = await request(url)
          .put(testRoute('not-a-uuid'))
          .send(payload)
          .set({ 'Content-Type': 'application/json' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(responseBody).toMatchObject({ name: 'ValidationError' });
        expect(responseBody.message).toMatch(/id/i);
      });
    });
  });

  describe('POST /groups/{id}/housing', () => {
    const testRoute = (id: string) => `/groups/${id}/housing`;

    let owner: OwnerApi;
    let housingList: HousingApi[];
    let establishmentHousingList: HousingApi[];
    let group: GroupApi;
    let payload: GroupPayloadDTO['housing'];

    beforeAll(async () => {
      owner = await factories.owner.create();
      housingList = await Promise.all([
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(establishment.geoCodes)
        }),
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(establishment.geoCodes)
        }),
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(establishment.geoCodes)
        }),
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(otherEstablishment.geoCodes)
        })
      ]);
      establishmentHousingList = housingList.filter((housing) =>
        establishment.geoCodes.includes(housing.geoCode)
      );
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      await Promise.all(
        housingList.map((housing) =>
          factories.housingOwner({ housing, owner }).create({ rank: 1 })
        )
      );
      await kysely
        .insertInto('groupsHousing')
        .values(
          establishmentHousingList.map((housing) => ({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
      payload = {
        all: false,
        ids: housingList.map((housing) => housing.id),
        filters: {}
      };
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await request(url)
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

      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should add the housing corresponding to the given criteria to the group', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      const { body, status } = await request(url)
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
        createdAt: expect.any(String),
        createdBy: toUserDTO(user),
        archivedAt: group.archivedAt?.toJSON() ?? null
      });
    });

    it('should create events when some housing get added', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      await factories.housingOwner({ housing, owner }).create({ rank: 1 });

      const { body, status } = await request(url)
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
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'groupHousingEvents',
          'groupHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('groupHousingEvents.groupId', '=', body.id)
        .where('groupHousingEvents.housingGeoCode', '=', housing.geoCode)
        .where('groupHousingEvents.housingId', '=', housing.id)
        .execute();
      expect(events).toIncludeAllPartialMembers([
        {
          type: 'housing:group-attached',
          createdBy: user.id
        }
      ]);
    });

    describe('validation', () => {
      it('should return 400 when body.all is missing', async () => {
        const { status, body: responseBody } = await request(url)
          .post(testRoute(group.id))
          .send({ ids: [], filters: {} })
          .set({ 'Content-Type': 'application/json' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(responseBody).toMatchObject({ name: 'ValidationError' });
        expect(responseBody.message).toMatch(/all/i);
      });

      it('should return 400 when :id is not a UUID', async () => {
        const { status, body: responseBody } = await request(url)
          .post(testRoute('not-a-uuid'))
          .send(payload)
          .set({ 'Content-Type': 'application/json' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(responseBody).toMatchObject({ name: 'ValidationError' });
        expect(responseBody.message).toMatch(/id/i);
      });
    });
  });

  describe('DELETE /groups/{id}/housing', () => {
    const testRoute = (id: string) => `/groups/${id}/housing`;

    let owner: OwnerApi;
    let housingList: HousingApi[];
    let establishmentHousingList: HousingApi[];
    let group: GroupApi;
    let payload: GroupPayloadDTO['housing'];

    beforeAll(async () => {
      owner = await factories.owner.create();
      housingList = await Promise.all([
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(establishment.geoCodes)
        }),
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(establishment.geoCodes)
        }),
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(establishment.geoCodes)
        }),
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(otherEstablishment.geoCodes)
        })
      ]);
      establishmentHousingList = housingList.filter((housing) =>
        establishment.geoCodes.includes(housing.geoCode)
      );
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      await Promise.all(
        housingList.map((housing) =>
          factories.housingOwner({ housing, owner }).create({ rank: 1 })
        )
      );
      await kysely
        .insertInto('groupsHousing')
        .values(
          establishmentHousingList.map((housing) => ({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
      payload = {
        all: false,
        ids: housingList.slice(2, 3).map((housing) => housing.id),
        filters: {}
      };
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url)
        .delete(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        });
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should be hidden for a user outside of the group's establishment", async () => {
      const { status } = await request(url)
        .delete(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(otherUser));
      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be hidden if the group has been archived', async () => {
      const group = await factories
        .group(establishment)
        .create(
          { archivedAt: new Date() },
          { associations: { createdBy: user } }
        );

      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should remove the housing corresponding to the given criteria to the group', async () => {
      const { body, status } = await request(url)
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
        createdAt: expect.any(String),
        createdBy: toUserDTO(user),
        archivedAt: group.archivedAt?.toJSON() ?? null
      });
    });

    it('should create events when some housing get removed', async () => {
      const { body, status } = await request(url)
        .delete(testRoute(group.id))
        .send(payload)
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'groupHousingEvents',
          'groupHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('groupHousingEvents.groupId', '=', body.id)
        .where('events.type', '=', 'housing:group-detached')
        .execute();
      expect(events.length).toBeGreaterThan(0);
      events.forEach((event) => {
        expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
          type: 'housing:group-detached',
          nextOld: { name: group.title },
          nextNew: null,
          createdBy: user.id
        });
      });
    });

    describe('validation', () => {
      it('should return 400 when body.all is missing', async () => {
        const { status, body: responseBody } = await request(url)
          .delete(testRoute(group.id))
          .send({ ids: [], filters: {} })
          .set({ 'Content-Type': 'application/json' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(responseBody).toMatchObject({ name: 'ValidationError' });
        expect(responseBody.message).toMatch(/all/i);
      });

      it('should return 400 when :id is not a UUID', async () => {
        const { status, body: responseBody } = await request(url)
          .delete(testRoute('not-a-uuid'))
          .send(payload)
          .set({ 'Content-Type': 'application/json' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(responseBody).toMatchObject({ name: 'ValidationError' });
      });
    });
  });

  describe('DELETE /groups/{id}', () => {
    const testRoute = (id: string): string => `/groups/${id}`;

    let group: GroupApi;
    let anotherGroup: GroupApi;
    let housingList: HousingApi[];
    let owner: OwnerApi;

    beforeEach(async () => {
      owner = await factories.owner.create();
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      anotherGroup = genGroupApi(otherUser, otherEstablishment);
      housingList = await Promise.all(
        Array.from({ length: 3 }, () =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes)
          })
        )
      );
      await kysely
        .insertInto('groupsHousing')
        .values(
          housingList.map((housing) => ({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
      await Promise.all(
        housingList.map((housing) =>
          factories.housingOwner({ housing, owner }).create({ rank: 1 })
        )
      );
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).delete(testRoute(group.id));
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should be hidden for a user outside of the establishment', async () => {
      const { status } = await request(url)
        .delete(testRoute(anotherGroup.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should remove a group', async () => {
      const { status } = await request(url)
        .delete(testRoute(group.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
    });

    it('should create events when a group is removed', async () => {
      const { status } = await request(url)
        .delete(testRoute(group.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const actual = await kysely
        .selectFrom('groupHousingEvents')
        .innerJoin('events', 'events.id', 'groupHousingEvents.eventId')
        .select([
          'events.type',
          'events.createdBy',
          'groupHousingEvents.groupId'
        ])
        .where((eb) =>
          eb(
            eb.refTuple(
              'groupHousingEvents.housingGeoCode',
              'groupHousingEvents.housingId'
            ),
            'in',
            housingList.map((housing) => eb.tuple(housing.geoCode, housing.id))
          )
        )
        .where('groupHousingEvents.groupId', 'is', null)
        .where('events.type', '=', 'housing:group-removed')
        .execute();
      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toPartiallyContain({
        type: 'housing:group-removed',
        createdBy: user.id,
        groupId: null
      });
    });

    describe('validation', () => {
      it('should return 400 when :id is not a UUID', async () => {
        const { status, body } = await request(url)
          .delete(testRoute('not-a-uuid'))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({ name: 'ValidationError' });
        expect(body.message).toMatch(/id/i);
      });
    });

    describe('If a campaign was created from the group', () => {
      beforeEach(async () => {
        await factories
          .campaign(establishment)
          .create({ groupId: group.id }, { associations: { createdBy: user } });
      });

      it('should archive a group', async () => {
        const { body, status } = await request(url)
          .delete(testRoute(group.id))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject({
          archivedAt: expect.any(String)
        });
        const actual = await kysely
          .selectFrom('groups')
          .selectAll('groups')
          .where('id', '=', group.id)
          .executeTakeFirst();
        expect(actual).toMatchObject({
          id: group.id,
          archivedAt: expect.any(Date)
        });
      });

      it('should create events when the group is archived', async () => {
        const { status } = await request(url)
          .delete(testRoute(group.id))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        const actual = await kysely
          .selectFrom('groupHousingEvents')
          .innerJoin('events', 'events.id', 'groupHousingEvents.eventId')
          .select([
            'events.type',
            'events.createdBy',
            'groupHousingEvents.groupId'
          ])
          .where((eb) =>
            eb(
              eb.refTuple(
                'groupHousingEvents.housingGeoCode',
                'groupHousingEvents.housingId'
              ),
              'in',
              housingList.map((housing) =>
                eb.tuple(housing.geoCode, housing.id)
              )
            )
          )
          .where('groupHousingEvents.groupId', '=', group.id)
          .where('events.type', '=', 'housing:group-archived')
          .execute();
        expect(actual.length).toBeGreaterThan(0);
        expect(actual).toPartiallyContain({
          type: 'housing:group-archived',
          createdBy: user.id,
          groupId: group.id
        });
      });
    });
  });
});
