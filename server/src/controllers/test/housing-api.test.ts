import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import {
  ACTIVE_OWNER_RANKS,
  fromHousing,
  HOUSING_STATUS_LABELS,
  HOUSING_STATUS_VALUES,
  HousingDTO,
  HousingStatus,
  HousingUpdatePayloadDTO,
  LastMutationTypeFilter,
  Occupancy,
  OCCUPANCY_LABELS,
  OCCUPANCY_VALUES,
  toOccupancy,
  UserRole,
  type HousingBatchUpdatePayload
} from '@zerologementvacant/models';
import {
  genDatafoncierHousing,
  genDatafoncierOwner,
  genDatafoncierOwners,
  genGeoCode,
  genIdprocpte,
  genIdprodroit
} from '@zerologementvacant/models/fixtures';
import async from 'async';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import db from '~/infra/database';

import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import {
  Buildings,
  formatBuildingApi
} from '~/repositories/buildingRepository';
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
  formatEventApi,
  HOUSING_EVENTS_TABLE,
  HousingEvents,
  HousingOwnerEvents,
  OwnerEvents,
  PRECISION_HOUSING_EVENTS_TABLE,
  PrecisionHousingEvents
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
import {
  HOUSING_NOTES_TABLE,
  Notes,
  type NoteRecordDBO
} from '~/repositories/noteRepository';
import {
  formatOwnerApi,
  OwnerRecordDBO,
  Owners,
  ownerTable
} from '~/repositories/ownerRepository';
import {
  HousingPrecisions,
  Precisions,
  type HousingPrecisionDBO
} from '~/repositories/precisionRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genBuildingApi,
  genCampaignApi,
  genDocumentApi,
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genOwnerApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';
import { Documents, toDocumentDBO } from '~/repositories/documentRepository';
import housingDocumentRepository, {
  HousingDocumentDBO,
  HousingDocuments
} from '~/repositories/housingDocumentRepository';

describe('Housing API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi('12345');
  const user: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.USUAL
  };
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
      const { status } = await request(url)
        .get(testRoute(anotherHousing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should have the given keys', async () => {
      const { body, status } = await request(url)
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
      const { status } = await request(url).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it("should forbid access to housing outside of an establishment's perimeter", async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.entities).toSatisfyAll<HousingApi>((housing) => {
        return establishment.geoCodes.includes(housing.geoCode);
      });
    });

    it('should return 200 OK', async () => {
      const { status } = await request(url)
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
          const { body, status } = await request(url)
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
        const { body, status } = await request(url)
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
        const { body, status } = await request(url)
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
        const { body, status } = await request(url)
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

          const { body, status } = await request(url)
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

          const { body, status } = await request(url)
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

          const { body, status } = await request(url)
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

          const { body, status } = await request(url)
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

          const { body, status } = await request(url)
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

          const { body, status } = await request(url)
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

      const { body, status } = await request(url)
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

      const { body, status } = await request(url)
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
      const { status } = await request(url).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if the housing already exists', async () => {
      const housing = genHousingApi(oneOf(establishment.geoCodes));
      await Housing().insert(formatHousingRecordApi(housing));
      const payload = {
        localId: housing.localId
      };

      const { status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CONFLICT);
    });

    it('should fail if the housing was not found in datafoncier', async () => {
      const payload = {
        localId: randomstring.generate(12)
      };

      const { status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a housing', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const ranks = faker.helpers.arrayElements(ACTIVE_OWNER_RANKS, 3);
      const datafoncierOwners = ranks.map((rank) =>
        genDatafoncierOwner(genIdprodroit(idprocpte, rank))
      );
      await Buildings().insert(formatBuildingApi(building));
      await Promise.all([
        DatafoncierHouses().insert({
          ...datafoncierHousing,
          geomloc: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.geomloc
          ]),
          ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.ban_geom
          ]),
          geomrnb: db.raw('ST_GeomFromGeoJson(?)', [datafoncierHousing.geomrnb])
        }),
        DatafoncierOwners().insert(datafoncierOwners)
      ]);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<Partial<HousingDTO>>({
        localId: payload.localId,
        dataYears: [2024],
        dataFileYears: ['ff-2024']
      });
    });

    it('should ignore owners update if they already exist', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 3);
      const existingOwners = datafoncierOwners.map<OwnerApi>(
        (datafoncierOwner) => {
          return {
            ...genOwnerApi(),
            idpersonne: datafoncierOwner.idpersonne
          };
        }
      );
      await Buildings().insert(formatBuildingApi(building));
      await Promise.all([
        DatafoncierHouses().insert({
          ...datafoncierHousing,
          geomloc: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.geomloc
          ]),
          ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.ban_geom
          ]),
          geomrnb: db.raw('ST_GeomFromGeoJson(?)', [datafoncierHousing.geomrnb])
        }),
        DatafoncierOwners().insert(datafoncierOwners),
        Owners().insert(existingOwners.map(formatOwnerApi))
      ]);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { status } = await request(url)
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
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 3);
      await Buildings().insert(formatBuildingApi(building));
      await Promise.all([
        DatafoncierHouses().insert({
          ...datafoncierHousing,
          geomloc: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.geomloc
          ]),
          ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.ban_geom
          ]),
          geomrnb: db.raw('ST_GeomFromGeoJson(?)', [datafoncierHousing.geomrnb])
        }),
        DatafoncierOwners().insert(datafoncierOwners)
      ]);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(url)
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

    it('should create an event "housing:created"', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 1);
      await Buildings().insert(formatBuildingApi(building));
      await Promise.all([
        DatafoncierHouses().insert({
          ...datafoncierHousing,
          geomloc: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.geomloc
          ]),
          ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.ban_geom
          ]),
          geomrnb: db.raw('ST_GeomFromGeoJson(?)', [datafoncierHousing.geomrnb])
        }),
        DatafoncierOwners().insert(datafoncierOwners)
      ]);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .type('json')
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

    it('should create an event "owner:created" for each missing owner', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 1);
      await Buildings().insert(formatBuildingApi(building));
      await Promise.all([
        DatafoncierHouses().insert({
          ...datafoncierHousing,
          geomloc: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.geomloc
          ]),
          ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.ban_geom
          ]),
          geomrnb: db.raw('ST_GeomFromGeoJson(?)', [datafoncierHousing.geomrnb])
        }),
        DatafoncierOwners().insert(datafoncierOwners)
      ]);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const housingOwners = await HousingOwners().where({
        housing_geo_code: body.geoCode,
        housing_id: body.id
      });
      const events = await OwnerEvents()
        .join(EVENTS_TABLE, 'id', 'event_id')
        .where({ type: 'owner:created' })
        .whereIn(
          'owner_id',
          housingOwners.map((housingOwner) => housingOwner.owner_id)
        );
      expect(events.length).toBe(datafoncierOwners.length);
    });

    it('should create an event "housing:owner-attached" for each housing owner', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = genBuildingApi();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 1);
      await Buildings().insert(formatBuildingApi(building));
      await Promise.all([
        DatafoncierHouses().insert({
          ...datafoncierHousing,
          geomloc: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.geomloc
          ]),
          ban_geom: db.raw('ST_GeomFromGeoJson(?)', [
            datafoncierHousing.ban_geom
          ]),
          geomrnb: db.raw('ST_GeomFromGeoJson(?)', [datafoncierHousing.geomrnb])
        }),
        DatafoncierOwners().insert(datafoncierOwners)
      ]);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const events = await HousingOwnerEvents()
        .join(EVENTS_TABLE, 'id', 'event_id')
        .where({
          type: 'housing:owner-attached',
          housing_geo_code: body.geoCode,
          housing_id: body.id
        });
      expect(events.length).toBe(datafoncierOwners.length);
    });
  });

  describe('PUT /housing', () => {
    const testRoute = '/api/housing';

    interface CreateHousingsOptions {
      count?: number;
      occupancy?: Occupancy;
      occupancyIntended?: Occupancy;
      status?: HousingStatus;
      subStatus?: string | null;
    }

    async function createHousings(options?: CreateHousingsOptions) {
      const { count, ...payload } = options ?? {};
      const housings = faker.helpers.multiple(
        () => ({
          ...genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
          ...payload
        }),
        { count }
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      await Owners().insert(
        housings.map((housing) => formatOwnerApi(housing.owner))
      );
      await HousingOwners().insert(
        housings.flatMap((housing) =>
          formatHousingOwnersApi(housing, [housing.owner])
        )
      );
      return { housings };
    }

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).put(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    test.prop<HousingBatchUpdatePayload>(
      {
        filters: fc.record(
          // Reduced version because they are tested elsewhere
          {
            all: fc.boolean(),
            housingIds: fc.array(fc.uuid({ version: 4 }))
          },
          {
            requiredKeys: []
          }
        ),
        status: fc.option(fc.constantFrom(...HOUSING_STATUS_VALUES), {
          nil: undefined
        }),
        occupancy: fc.option(fc.constantFrom(...OCCUPANCY_VALUES), {
          nil: undefined
        }),
        subStatus: fc.option(fc.stringMatching(/\S/), { nil: undefined }),
        occupancyIntended: fc.option(fc.constantFrom(...OCCUPANCY_VALUES), {
          nil: undefined
        }),
        note: fc.option(fc.stringMatching(/\S/), {
          nil: undefined
        })
      },
      { verbose: true, numRuns: 20 }
    )('should validate inputs', async (payload) => {
      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should be forbidden to set status "NeverContacted" for housings that have already been contacted', async () => {
      const { housings } = await createHousings({
        status: HousingStatus.WAITING
      });
      const campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsHousing().insert(
        formatCampaignHousingApi(campaign, housings)
      );
      const payload: HousingBatchUpdatePayload = {
        filters: {
          status: HousingStatus.WAITING
        },
        status: HousingStatus.NEVER_CONTACTED
      };

      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should update the housings', async () => {
      const { housings } = await createHousings();
      const payload: HousingBatchUpdatePayload = {
        filters: {
          all: false,
          housingIds: housings.map((housing) => housing.id)
        },
        occupancy: Occupancy.SECONDARY_RESIDENCE,
        status: HousingStatus.WAITING
      };

      const { body, status } = await request(url)
        .put(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toIncludeAllPartialMembers(
        housings.map((housing) => ({
          id: housing.id,
          occupancy: payload.occupancy,
          status: payload.status
        }))
      );

      const actual = await Housing().whereIn(
        ['geo_code', 'id'],
        housings.map((housing) => [housing.geoCode, housing.id])
      );
      expect(actual).toBeDefined();
      actual.forEach((housing) => {
        expect(housing).toMatchObject<Partial<HousingRecordDBO>>({
          status: payload.status,
          occupancy: payload.occupancy
        });
      });
    });

    it('should create events related to the status change', async () => {
      const { housings } = await createHousings({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      });
      const payload: HousingBatchUpdatePayload = {
        filters: {
          status: HousingStatus.NEVER_CONTACTED
        },
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'En accompagnement'
      };

      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          housings.map((housing) => [housing.geoCode, housing.id])
        )
        .where({ type: 'housing:status-updated' });
      events.forEach((event) => {
        expect(event).toMatchObject<
          Partial<EventRecordDBO<'housing:status-updated'>>
        >({
          type: 'housing:status-updated',
          next_old: {
            status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED],
            subStatus: null
          },
          next_new: {
            status: HOUSING_STATUS_LABELS[payload.status!],
            subStatus: payload.subStatus!
          },
          created_by: user.id
        });
      });
    });

    it('should create events related to the occupancy change', async () => {
      const { housings } = await createHousings({
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.VACANT
      });
      const payload: HousingBatchUpdatePayload = {
        filters: {
          occupancies: [Occupancy.VACANT]
        },
        occupancy: Occupancy.SECONDARY_RESIDENCE,
        occupancyIntended: Occupancy.SECONDARY_RESIDENCE
      };

      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          housings.map((housing) => [housing.geoCode, housing.id])
        )
        .where({ type: 'housing:occupancy-updated' });
      events.forEach((event) => {
        expect(event).toMatchObject<
          Partial<EventRecordDBO<'housing:occupancy-updated'>>
        >({
          type: 'housing:occupancy-updated',
          created_by: user.id,
          next_old: {
            occupancy: OCCUPANCY_LABELS[Occupancy.VACANT],
            occupancyIntended: OCCUPANCY_LABELS[Occupancy.VACANT]
          },
          next_new: {
            occupancy: OCCUPANCY_LABELS[payload.occupancy!],
            occupancyIntended: OCCUPANCY_LABELS[payload.occupancyIntended!]
          }
        });
      });
    });

    it('should create a note', async () => {
      const { housings } = await createHousings({
        count: 3,
        status: HousingStatus.WAITING
      });
      const payload: HousingBatchUpdatePayload = {
        filters: {
          status: HousingStatus.WAITING
        },
        note: 'Nouvelle note'
      };

      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await Notes()
        .join(HOUSING_NOTES_TABLE, 'note_id', 'id')
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          housings.map((housing) => [housing.geoCode, housing.id])
        );
      actual.forEach((note) => {
        expect(note).toMatchObject<Partial<NoteRecordDBO>>({
          content: 'Nouvelle note'
        });
      });
    });

    it('should add precisions to multiple housings', async () => {
      const { housings } = await createHousings({
        count: 2
      });
      const allPrecisions = await Precisions();
      const precisions = faker.helpers.arrayElements(allPrecisions, 2);

      const { body, status } = await request(url)
        .put('/api/housing')
        .send({
          filters: {
            housingIds: housings.map((housing) => housing.id)
          },
          precisions: precisions.map((precision) => precision.id)
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toHaveLength(2);

      // Verify precision links created
      const links = await HousingPrecisions()
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          housings.map((housing) => [housing.geoCode, housing.id])
        )
        .select();
      expect(links).toHaveLength(4); // 2 housings * 2 precisions
    });

    it('should create events related to the precision changes', async () => {
      const { housings } = await createHousings({
        count: 2
      });
      const allPrecisions = await Precisions();
      const precisions = faker.helpers.arrayElements(allPrecisions, 2);

      const { status } = await request(url)
        .put('/api/housing')
        .send({
          filters: {
            housingIds: housings.map((housing) => housing.id)
          },
          precisions: precisions.map((precision) => precision.id)
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const events = await Events()
        .where({ type: 'housing:precision-attached' })
        .join(PRECISION_HOUSING_EVENTS_TABLE, 'id', 'event_id')
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          housings.map((housing) => [housing.geoCode, housing.id])
        )
        .select();
      expect(events).toHaveLength(4); // 2 housings * 2 precisions
    });

    it('should not create events for existing precision links', async () => {
      const { housings } = await createHousings({
        count: 1
      });
      const [housing] = housings;
      const allPrecisions = await Precisions();
      const precisions = faker.helpers.arrayElements(allPrecisions, 2);

      // First, add the precisions
      await HousingPrecisions().insert(
        precisions.map((precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id,
          created_at: new Date()
        }))
      );
      // Create related events
      const events = precisions.map((precision) =>
        genEventApi({
          type: 'housing:precision-attached',
          nextOld: null,
          nextNew: {
            category: precision.category,
            label: precision.label
          },
          creator: user
        })
      );
      await Events().insert(events.map(formatEventApi));
      await PrecisionHousingEvents().insert(
        events.map((event) => ({
          event_id: event.id,
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        }))
      );

      // Add the same precisions again via API
      const { status } = await request(url)
        .put('/api/housing')
        .send({
          filters: {
            housingIds: [housing.id]
          },
          precisions: precisions.map((precision) => precision.id)
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      // Should still have only the original 2 precision links
      const links = await HousingPrecisions()
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        })
        .select();
      expect(links).toHaveLength(2);

      // Should have no new events
      const eventsAgain = await Events()
        .where({
          type: 'housing:precision-attached'
        })
        .join(PRECISION_HOUSING_EVENTS_TABLE, 'id', 'event_id')
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        })
        .select();
      expect(eventsAgain).toHaveLength(housings.length * precisions.length);
    });

    it('should add only new precisions (add-only mode)', async () => {
      const { housings } = await createHousings({
        count: 1
      });
      const [housing] = housings;
      const allPrecisions = await Precisions();
      const existingPrecisions = faker.helpers.arrayElements(allPrecisions, 2);
      const newPrecisions = faker.helpers.arrayElements(
        allPrecisions.filter(
          (p) => !existingPrecisions.some((ep) => ep.id === p.id)
        ),
        1
      );

      // Add initial precisions
      await HousingPrecisions().insert(
        existingPrecisions.map((precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id,
          created_at: new Date()
        }))
      );

      const { status } = await request(url)
        .put('/api/housing')
        .send({
          filters: {
            housingIds: [housing.id]
          },
          precisions: newPrecisions.map((precision) => precision.id)
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const links = await HousingPrecisions()
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        })
        .select();
      expect(links).toHaveLength(
        existingPrecisions.length + newPrecisions.length
      );
    });

    // For example, in the subcategory "travaux", there cannot be
    // a precision "en cours" and "terminé" at the same time.
    it('should keep only one precision per evolution subcategory', async () => {
      const { housings } = await createHousings({
        count: 2
      });
      const allPrecisions = await Precisions();
      const travaux = allPrecisions.filter(
        (precision) => precision.category === 'travaux'
      );
      const initialPrecisions: HousingPrecisionDBO[] = [
        {
          housing_geo_code: housings[0].geoCode,
          housing_id: housings[0].id,
          precision_id: travaux[0].id,
          created_at: new Date()
        },
        {
          housing_geo_code: housings[1].geoCode,
          housing_id: housings[1].id,
          precision_id: travaux[1].id,
          created_at: new Date()
        }
      ];
      const newPrecision = travaux[1]

      // Add initial precision
      await HousingPrecisions().insert(initialPrecisions);

      const { status } = await request(url)
        .put('/api/housing')
        .send({
          filters: {
            housingIds: housings.map(housing => housing.id)
          },
          precisions: [newPrecision.id]
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await HousingPrecisions().whereIn(['housing_geo_code', 'housing_id'], housings.map(housing => [housing.geoCode, housing.id]));
      expect(actual).toHaveLength(2)
      expect(actual).toIncludeAllPartialMembers([
        {
          housing_geo_code: housings[0].geoCode,
          housing_id: housings[0].id,
          precision_id: newPrecision.id
        },
        {
          housing_geo_code: housings[1].geoCode,
          housing_id: housings[1].id,
          precision_id: newPrecision.id
        }
      ])
    });

    it('should link documents to multiple housings in batch update', async () => {
      const { housings } = await createHousings({ count: 2 });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));

      const { status, body } = await request(url)
        .put(testRoute)
        .send({
          filters: {
            establishmentIds: [establishment.id],
            housingIds: housings.map(housing => housing.id)
          },
          documents: [document.id],
          status: HousingStatus.IN_PROGRESS
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toHaveLength(2);

      // Verify both housings have the document linked
      const actual = await HousingDocuments().where({
        document_id: document.id
      });
      expect(actual).toHaveLength(2);
      expect(actual).toIncludeAllPartialMembers<HousingDocumentDBO>([
        {
          housing_geo_code: housings[0].geoCode,
          housing_id: housings[0].id,
          document_id: document.id
        },
        {
          housing_geo_code: housings[1].geoCode,
          housing_id: housings[1].id,
          document_id: document.id
        }
      ]);
    });

    it('should update status AND link documents in same request', async () => {
      const { housings } = await createHousings({ count: 1 });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await Documents().insert(toDocumentDBO(document));

      const { status, body } = await request(url)
        .put(testRoute)
        .send({
          filters: {
            establishmentIds: [establishment.id],
            housingIds: [housings[0].id]
          },
          status: HousingStatus.IN_PROGRESS,
          note: 'Batch update with docs',
          documents: [document.id]
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body[0]).toMatchObject({
        id: housings[0].id,
        status: HousingStatus.IN_PROGRESS
      });

      // Verify document linked
      const links = await housingDocumentRepository.find({
        filters: {
          housingIds: [{ id: housings[0].id, geoCode: housings[0].geoCode }]
        }
      });
      expect(links).toHaveLength(1);
    });

    it('should handle empty documents gracefully', async () => {
      const { housings } = await createHousings({ count: 1 });

      const { status } = await request(url)
        .put(testRoute)
        .send({
          filters: {
            establishmentIds: [establishment.id],
            housingIds: [housings[0].id]
          },
          status: HousingStatus.IN_PROGRESS,
          documents: []
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
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
      const { status } = await request(url)
        .put(testRoute(faker.string.uuid()))
        .send(defaultPayload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should throw if the user is a visitor', async () => {
      const housing = await createHousing();

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(defaultPayload)
        .type('json')
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
    });

    it('should return the housing', async () => {
      const housing = await createHousing({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null,
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.VACANT
      });
      const payload = defaultPayload;

      const { body, status } = await request(url)
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

      const { status } = await request(url)
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

      const { status } = await request(url)
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

      const { status } = await request(url)
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

      const { status } = await request(url)
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

      const { status } = await request(url)
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
});
