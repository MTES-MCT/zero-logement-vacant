import { faker } from '@faker-js/faker/locale/fr';
import {
  fromHousing,
  HOUSING_STATUS_LABELS,
  HousingDTO,
  HousingStatus,
  HousingUpdatePayloadDTO,
  LastMutationTypeFilter,
  Occupancy,
  OCCUPANCY_LABELS,
  OCCUPANCY_VALUES,
  toOccupancy,
  UserRole
} from '@zerologementvacant/models';
import { genGeoCode } from '@zerologementvacant/models/fixtures';
import async from 'async';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { MarkRequired } from 'ts-essentials';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import {
  CampaignsHousing,
  formatCampaignHousingApi
} from '~/repositories/campaignHousingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import { DatafoncierHouses } from '~/repositories/datafoncierHousingRepository';
import { DatafoncierOwners } from '~/repositories/datafoncierOwnersRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  EventRecordDBO,
  Events,
  EVENTS_TABLE,
  HOUSING_EVENTS_TABLE,
  HousingEvents
} from '~/repositories/eventRepository';
import {
  formatHousingOwnersApi,
  HousingOwners,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { HOUSING_NOTES_TABLE, Notes } from '~/repositories/noteRepository';
import {
  formatOwnerApi,
  OwnerRecordDBO,
  Owners,
  ownerTable
} from '~/repositories/ownerRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
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
import { tokenProvider } from '~/test/testUtils';

describe('Housing API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi('12345');
  const user = genUserApi(establishment.id);
  const visitor: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.VISITOR
  };
  const anotherEstablishment = genEstablishmentApi('23456');
  const anotherUser = genUserApi(anotherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert([user, visitor, anotherUser].map(formatUserApi));
  });

  describe('GET /housing/{id}', () => {
    const testRoute = (id: string) => `/api/housing/${id}`;

    const housing = genHousingApi(
      faker.helpers.arrayElement(establishment.geoCodes)
    );
    const owner = genOwnerApi();
    const anotherHousing = genHousingApi(
      faker.helpers.arrayElement(anotherEstablishment.geoCodes)
    );
    const anotherOwner = genOwnerApi();

    beforeAll(async () => {
      await Housing().insert(
        [housing, anotherHousing].map(formatHousingRecordApi)
      );
      await Owners().insert([owner, anotherOwner].map(formatOwnerApi));
      await HousingOwners().insert([
        ...formatHousingOwnersApi(housing, [owner]),
        ...formatHousingOwnersApi(anotherHousing, [anotherOwner])
      ]);
    });

    it("should forbid access to housing outside of an establishment's perimeter", async () => {
      const { status } = await request(app)
        .get(testRoute(anotherHousing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should have the given keys', async () => {
      const { body, status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toContainKeys<HousingDTO>([
        'id',
        'geoCode',
        'lastMutationDate',
        'lastTransactionDate',
        'lastTransactionValue'
      ]);
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

      describe('Mutation', () => {
        async function createHousings(
          payloads: ReadonlyArray<
            Pick<
              HousingApi,
              | 'lastMutationDate'
              | 'lastTransactionDate'
              | 'lastTransactionValue'
            >
          >
        ): Promise<ReadonlyArray<HousingApi>> {
          const housings = payloads.map((payload) => ({
            ...genHousingApi(
              faker.helpers.arrayElement(establishment.geoCodes)
            ),
            ...payload
          }));
          const owners = housings.map((housing) => housing.owner);
          await Promise.all([
            Housing().insert(housings.map(formatHousingRecordApi)),
            Owners().insert(owners.map(formatOwnerApi))
          ]);
          await async.forEach(housings, async (housing) => {
            await HousingOwners().insert(
              formatHousingOwnersApi(housing, [housing.owner])
            );
          });
          return housings;
        }

        it('should filter by a single mutation date', async () => {
          await createHousings([
            {
              lastMutationDate: '2022-01-01',
              lastTransactionDate: '2000-01-01',
              lastTransactionValue: 1_000_000
            },
            {
              lastMutationDate: null,
              lastTransactionDate: '2022-01-01',
              lastTransactionValue: 1_000_000
            },
            {
              lastMutationDate: null,
              lastTransactionDate: null,
              lastTransactionValue: null
            }
          ]);

          const { body, status } = await request(app)
            .get(testRoute)
            .query({
              lastMutationYears: '2022'
            })
            .use(tokenProvider(user));

          expect(status).toBe(constants.HTTP_STATUS_OK);
          expect(body.entities.length).toBeGreaterThan(0);
          expect(body.entities).toSatisfyAll<HousingDTO>((housing) => {
            const mutation = fromHousing(housing);
            return mutation?.date?.getUTCFullYear() === 2022;
          });
        });

        it('should filter by a range of mutation dates', async () => {
          await createHousings([
            {
              lastMutationDate: '2010-01-01',
              lastTransactionDate: '2000-01-01',
              lastTransactionValue: null
            },
            {
              lastMutationDate: '2014-01-01',
              lastTransactionDate: '2000-01-01',
              lastTransactionValue: null
            }
          ]);

          const { body, status } = await request(app)
            .get(testRoute)
            .query({
              lastMutationYears: '2010to2014'
            })
            .use(tokenProvider(user));

          expect(status).toBe(constants.HTTP_STATUS_OK);
          expect(body.entities.length).toBeGreaterThan(0);
          expect(body.entities).toSatisfyAll<HousingDTO>((housing) => {
            const mutation = fromHousing(housing);
            const year = mutation?.date?.getUTCFullYear();
            return year !== undefined && 2010 <= year && year <= 2014;
          });
        });

        it('should filter by a single mutation type', async () => {
          await createHousings([
            {
              lastMutationDate: '2022-01-01',
              lastTransactionDate: '2000-01-01',
              lastTransactionValue: null
            },
            {
              lastMutationDate: '2022-01-02',
              lastTransactionDate: null,
              lastTransactionValue: null
            }
          ]);

          const { body, status } = await request(app)
            .get(testRoute)
            .query({
              lastMutationTypes: 'donation'
            })
            .use(tokenProvider(user));

          expect(status).toBe(constants.HTTP_STATUS_OK);
          expect(body.entities.length).toBeGreaterThan(0);
          expect(body.entities).toSatisfyAll<HousingDTO>((housing) => {
            const mutation = fromHousing(housing);
            return mutation?.type === 'donation';
          });
        });

        it('should filter by several mutation types', async () => {
          await createHousings([
            {
              lastMutationDate: '2022-01-01',
              lastTransactionDate: '2000-01-01',
              lastTransactionValue: null
            },
            {
              lastMutationDate: '2022-01-01',
              lastTransactionDate: '2023-01-01',
              lastTransactionValue: 1_000_000
            }
          ]);
          const types: ReadonlyArray<LastMutationTypeFilter> = [
            'donation',
            'sale'
          ];

          const { body, status } = await request(app)
            .get(testRoute)
            .query({
              lastMutationTypes: types.join(',')
            })
            .use(tokenProvider(user));

          expect(status).toBe(constants.HTTP_STATUS_OK);
          expect(body.entities.length).toBeGreaterThan(0);
          expect(body.entities).toSatisfyAll<HousingDTO>((housing) => {
            const mutation = fromHousing(housing);
            return types.some((type) => type === mutation?.type);
          });
        });

        it('should filter by mutation date and type', async () => {
          await createHousings([
            {
              lastMutationDate: '2020-01-01',
              lastTransactionDate: '2019-01-01',
              lastTransactionValue: null
            }
          ]);

          const { body, status } = await request(app)
            .get(testRoute)
            .query({
              lastMutationTypes: 'donation',
              lastMutationYears: '2021'
            })
            .use(tokenProvider(user));

          expect(status).toBe(constants.HTTP_STATUS_OK);
          expect(body.entities).toSatisfyAll<HousingDTO>((housing) => {
            const mutation = fromHousing(housing);
            return (
              mutation?.type === 'donation' &&
              mutation?.date?.getUTCFullYear() === 2021
            );
          });
        });

        it('should filter by null mutation date and type', async () => {
          await createHousings([
            {
              lastMutationDate: null,
              lastTransactionDate: null,
              lastTransactionValue: null
            }
          ]);

          const { body, status } = await request(app)
            .get(testRoute)
            .query({
              lastMutationTypes: 'null',
              lastMutationYears: 'null'
            })
            .use(tokenProvider(user));

          expect(status).toBe(constants.HTTP_STATUS_OK);
          expect(body.entities).toSatisfyAll<HousingDTO>((housing) => {
            const mutation = fromHousing(housing);
            return (
              mutation === null ||
              (mutation.type === null && mutation.date === null)
            );
          });
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
        .join(EVENTS_TABLE, 'id', 'event_id')
        .where({
          type: 'housing:created',
          housing_geo_code: body.geoCode,
          housing_id: body.id
        })
        .first();
      expect(event).toMatchObject<Partial<EventRecordDBO<'housing:created'>>>({
        type: 'housing:created',
        created_by: user.id,
        next_old: null,
        next_new: {
          source: 'datafoncier-manual',
          occupancy: OCCUPANCY_LABELS[toOccupancy(datafoncierHousing.ccthp)]
        }
      });
    });
  });

  describe('PUT /housing/{id}', () => {
    const testRoute = (id: string) => `/api/housing/${id}`;
    const defaultPayload: HousingUpdatePayloadDTO = {
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: null,
      occupancy: Occupancy.VACANT,
      occupancyIntended: null
    };

    async function createHousing(
      options?: Partial<Pick<HousingApi, keyof HousingUpdatePayloadDTO>>
    ) {
      const housing: HousingApi = {
        ...genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
        ...options
      };
      const owner = genOwnerApi();
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(formatHousingOwnersApi(housing, [owner]));
      return housing;
    }

    it('should throw if the housing was not found', async () => {
      const { status } = await request(app)
        .put(testRoute(faker.string.uuid()))
        .send(defaultPayload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should throw if the user is a visitor', async () => {
      const housing = await createHousing();

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(defaultPayload)
        .type('json')
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should return the housing', async () => {
      const housing = await createHousing({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.VACANT
      });
      const payload = defaultPayload;

      const { body, status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDTO>>({
        id: housing.id,
        status: payload.status,
        subStatus: null,
        occupancy: payload.occupancy,
        occupancyIntended: payload.occupancyIntended
      });
    });

    it('should update the housing', async () => {
      const housing = await createHousing({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.VACANT
      });
      const payload: HousingUpdatePayloadDTO = {
        status: HousingStatus.COMPLETED,
        subStatus: 'Remis en location',
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.RENT
      };

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actual = await Housing().where('id', housing.id).first();
      expect(actual).toMatchObject<Partial<HousingRecordDBO>>({
        id: housing.id,
        status: payload.status,
        sub_status: payload.subStatus,
        occupancy: payload.occupancy,
        occupancy_intended: payload.occupancyIntended
      });
    });

    it('should not create events if there is no change', async () => {
      const housing = await createHousing({
        status: HousingStatus.COMPLETED,
        subStatus: 'Remis en location',
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.RENT
      });
      const payload: HousingUpdatePayloadDTO = {
        status: housing.status,
        subStatus: housing.subStatus,
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended
      };

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await HousingEvents().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(events).toHaveLength(0);
    });

    it('should create an event related to the status change', async () => {
      const housing = await createHousing({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.VACANT
      });
      const payload: HousingUpdatePayloadDTO = {
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'En cours de traitement',
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended
      };

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          housing_id: housing.id,
          housing_geo_code: housing.geoCode,
          type: 'housing:status-updated'
        })
        .first();
      expect(event).toMatchObject<
        Partial<EventRecordDBO<'housing:status-updated'>>
      >({
        type: 'housing:status-updated',
        next_old: {
          status: HOUSING_STATUS_LABELS[housing.status],
          subStatus: housing.subStatus
        },
        next_new: {
          status: HOUSING_STATUS_LABELS[payload.status],
          subStatus: payload.subStatus
        },
        created_by: user.id
      });
    });

    it('should create an event related to the occupancy change', async () => {
      const housing = await createHousing({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.VACANT
      });
      const payload: HousingUpdatePayloadDTO = {
        status: housing.status,
        subStatus: housing.subStatus,
        occupancy: Occupancy.DEMOLISHED_OR_DIVIDED,
        occupancyIntended: Occupancy.DEMOLISHED_OR_DIVIDED
      };

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          type: 'housing:occupancy-updated'
        })
        .first();
      expect(event).toMatchObject<
        Partial<EventRecordDBO<'housing:occupancy-updated'>>
      >({
        name: "Modification du statut d'occupation",
        type: 'housing:occupancy-updated',
        next_old: {
          occupancy: OCCUPANCY_LABELS[housing.occupancy],
          occupancyIntended: OCCUPANCY_LABELS[housing.occupancyIntended!]
        },
        next_new: {
          occupancy: OCCUPANCY_LABELS[payload.occupancy],
          occupancyIntended: OCCUPANCY_LABELS[payload.occupancyIntended!]
        },
        created_by: user.id
      });
    });

    it('should create an event with the fields that changed only', async () => {
      const housing = await createHousing({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.VACANT
      });
      const payload: HousingUpdatePayloadDTO = {
        status: HousingStatus.IN_PROGRESS,
        subStatus: null,
        occupancy: housing.occupancy,
        occupancyIntended: Occupancy.RENT
      };

      const { status } = await request(app)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const statusEvent = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          type: 'housing:status-updated'
        })
        .first();
      expect(statusEvent).toMatchObject<
        Partial<EventRecordDBO<'housing:status-updated'>>
      >({
        type: 'housing:status-updated',
        next_old: {
          status: HOUSING_STATUS_LABELS[housing.status]
        },
        next_new: {
          status: HOUSING_STATUS_LABELS[payload.status]
        },
        created_by: user.id
      });
      const occupancyEvent = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          type: 'housing:occupancy-updated'
        })
        .first();
      expect(occupancyEvent).toMatchObject<
        Partial<EventRecordDBO<'housing:occupancy-updated'>>
      >({
        type: 'housing:occupancy-updated',
        next_old: {
          occupancyIntended: OCCUPANCY_LABELS[housing.occupancyIntended!]
        },
        next_new: {
          occupancyIntended: OCCUPANCY_LABELS[payload.occupancyIntended!]
        },
        created_by: user.id
      });
    });
  });

  describe('POST /housing/list', () => {
    const testRoute = '/api/housing/list';

    const campaign = genCampaignApi(establishment.id, user.id);
    const housing: MarkRequired<HousingApi, 'owner'> = {
      ...genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
      status: HousingStatus.WAITING
    };
    const payload = {
      filters: {
        status: HousingStatus.WAITING,
        campaignIds: [campaign.id]
      },
      housingIds: [housing.id],
      allHousing: false,
      housingUpdate: {
        statusUpdate: {
          status: HousingStatus.IN_PROGRESS,
          vacancyReasons: [randomstring.generate()]
        },
        occupancyUpdate: {
          occupancy: Occupancy.VACANT,
          occupancyIntended: Occupancy.DEMOLISHED_OR_DIVIDED
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
            status: HousingStatus.WAITING
          },
          housingUpdate: {
            statusUpdate: {
              status: HousingStatus.NEVER_CONTACTED
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
      const events = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          housing_id: housing.id,
          housing_geo_code: housing.geoCode,
          type: 'housing:status-updated'
        });
      events.forEach((event) => {
        expect(event).toMatchObject<
          Partial<EventRecordDBO<'housing:status-updated'>>
        >({
          type: 'housing:status-updated',
          next_old: {
            status: HOUSING_STATUS_LABELS[housing.status]
          },
          next_new: {
            status:
              HOUSING_STATUS_LABELS[payload.housingUpdate.statusUpdate.status]
          },
          created_by: user.id
        });
      });
    });

    it('should create an event related to the occupancy change', async () => {
      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          type: 'housing:occupancy-updated',
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        });
      events.forEach((event) => {
        expect(event).toMatchObject<
          Partial<EventRecordDBO<'housing:occupancy-updated'>>
        >({
          name: "Modification du statut d'occupation",
          type: 'housing:occupancy-updated',
          created_by: user.id,
          next_old: {
            occupancy: OCCUPANCY_LABELS[housing.occupancy],
            occupancyIntended: OCCUPANCY_LABELS[housing.occupancyIntended!]
          },
          next_new: {
            occupancy:
              OCCUPANCY_LABELS[payload.housingUpdate.occupancyUpdate.occupancy],
            occupancyIntended:
              OCCUPANCY_LABELS[
                payload.housingUpdate.occupancyUpdate.occupancyIntended
              ]
          }
        });
      });
    });

    it('should create a note', async () => {
      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await Notes()
        .join(HOUSING_NOTES_TABLE, 'note_id', 'id')
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
