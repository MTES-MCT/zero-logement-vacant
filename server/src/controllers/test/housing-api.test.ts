import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import {
  ACTIVE_OWNER_RANKS,
  fromHousing,
  getSubStatuses,
  HOUSING_POINT_FIELDS,
  HOUSING_STATUS_LABELS,
  HousingDTO,
  HousingStatus,
  HousingUpdatePayloadDTO,
  LastMutationTypeFilter,
  Occupancy,
  OCCUPANCY_LABELS,
  OCCUPANCY_VALUES,
  OwnerRank,
  PrecisionCategory,
  toOccupancy,
  UserRole,
  type DatafoncierHousing,
  type DatafoncierOwner,
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
import { sql, type Selectable } from 'kysely';
import nock from 'nock';
import randomstring from 'randomstring';
import request from 'supertest';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { HousingApi } from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import { toDocumentInsert } from '~/repositories/documentRepository';
import { toEstablishmentInsert } from '~/repositories/establishmentRepository';
import { toEventInsert } from '~/repositories/eventRepository';
import housingDocumentRepository from '~/repositories/housingDocumentRepository';
import userPerimeterRepository from '~/repositories/userPerimeterRepository';
import { toUserInsert } from '~/repositories/userRepository';
import { factories } from '~/test/factories';
import {
  genDocumentApi,
  genEstablishmentApi,
  genEventApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

// Kysely raw insert for df_housing_nat_2024: the codegen key `dfHousingNat2024`
// doesn't round-trip through CamelCasePlugin to the real table name, and
// insertInto() only accepts a literal table key — so build the statement with a
// literal table reference and ST_GeomFromGeoJson() for the PostGIS columns.
async function insertDatafoncierHousing(
  datafoncierHousing: DatafoncierHousing
): Promise<void> {
  const { ban_geom, geomloc, geomrnb, ...rest } = datafoncierHousing;
  const columns = Object.keys(rest);
  const columnRefs = [...columns, 'ban_geom', 'geomloc', 'geomrnb'].map(
    (column) => sql.ref(column)
  );
  const values = [
    ...columns.map(
      (column) => sql`${(rest as Record<string, unknown>)[column]}`
    ),
    sql`ST_GeomFromGeoJson(${JSON.stringify(ban_geom)})`,
    sql`ST_GeomFromGeoJson(${JSON.stringify(geomloc)})`,
    sql`ST_GeomFromGeoJson(${JSON.stringify(geomrnb)})`
  ];
  await sql`
    insert into df_housing_nat_2024 (${sql.join(columnRefs)})
    values (${sql.join(values)})
  `.execute(kysely);
}

// df_owners_nat_2024 has no PostGIS columns, but the codegen key
// `dfOwnersNat2024` doesn't round-trip through CamelCasePlugin either — so each
// owner is inserted with a literal table reference (mirrors
// insertDatafoncierHousing above).
async function insertDatafoncierOwners(
  datafoncierOwners: ReadonlyArray<DatafoncierOwner>
): Promise<void> {
  await Promise.all(
    datafoncierOwners.map((datafoncierOwner) => {
      const columns = Object.keys(datafoncierOwner);
      const columnRefs = columns.map((column) => sql.ref(column));
      const values = columns.map(
        (column) =>
          sql`${(datafoncierOwner as unknown as Record<string, unknown>)[column]}`
      );
      return sql`
        insert into df_owners_nat_2024 (${sql.join(columnRefs)})
        values (${sql.join(values)})
      `.execute(kysely);
    })
  );
}

describe('Housing API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let user: UserApi;
  let visitor: UserApi;
  let anotherEstablishment: EstablishmentApi;

  beforeAll(async () => {
    [establishment, anotherEstablishment] = await Promise.all([
      factories.establishment.create(),
      factories.establishment.create()
    ]);
    [user, visitor] = await Promise.all([
      factories.user.create({
        establishmentId: establishment.id,
        role: UserRole.USUAL
      }),
      factories.user.create({
        establishmentId: establishment.id,
        role: UserRole.VISITOR
      })
    ]);
  });

  describe('GET /housing/{id}', () => {
    const testRoute = (id: string) => `/housing/${id}`;

    let housing: HousingApi;
    let anotherHousing: HousingApi;

    beforeAll(async () => {
      [housing, anotherHousing] = await Promise.all([
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(establishment.geoCodes)
        }),
        factories.housing.create({
          geoCode: faker.helpers.arrayElement(anotherEstablishment.geoCodes)
        })
      ]);
      const [owner, anotherOwner] = await factories.owner.createList(2);
      await Promise.all([
        factories
          .housingOwner({ housing, owner })
          .create({ rank: 1 as OwnerRank }),
        factories
          .housingOwner({ housing: anotherHousing, owner: anotherOwner })
          .create({ rank: 1 as OwnerRank })
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

    it('should resolve housing by its 12-char localId', async () => {
      const { body, status } = await request(url)
        .get(testRoute(housing.localId))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDTO>>({
        id: housing.id,
        localId: housing.localId
      });
    });

    describe('validation', () => {
      it('should return 400 when :id is neither a 12-char localId nor a UUID', async () => {
        const { status, body } = await request(url)
          .get(testRoute('short'))
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({ name: 'ValidationError' });
        expect(body.message).toMatch(/id/i);
      });
    });
  });

  describe('GET /housings', () => {
    const testRoute = '/housings';

    beforeAll(async () => {
      const housings = await Promise.all([
        ...Array.from({ length: 5 }, () =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes)
          })
        ),
        ...Array.from({ length: 3 }, () =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(anotherEstablishment.geoCodes)
          })
        )
      ]);
      await Promise.all(
        housings.map(async (housing) => {
          const owner = await factories.owner.create();
          await factories
            .housingOwner({ housing, owner })
            .create({ rank: 1 as OwnerRank });
        })
      );
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
      expect(body).toSatisfyAll<HousingApi>((housing) => {
        return establishment.geoCodes.includes(housing.geoCode);
      });
    });

    it('should return 200 OK', async () => {
      const { status } = await request(url)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should let a visitor scope results to a queried establishment', async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .query({ establishmentIds: [anotherEstablishment.id] })
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toSatisfyAll<HousingApi>((housing) => {
        return anotherEstablishment.geoCodes.includes(housing.geoCode);
      });
      expect(body).not.toSatisfyAny((housing: HousingApi) => {
        return establishment.geoCodes.includes(housing.geoCode);
      });
    });

    it('should ignore a queried establishment for a non-admin, non-visitor user', async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .query({ establishmentIds: [anotherEstablishment.id] })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toSatisfyAll<HousingApi>((housing) => {
        return establishment.geoCodes.includes(housing.geoCode);
      });
    });

    describe('Projection via ?fields=', () => {
      const pointFields = [...HOUSING_POINT_FIELDS] as string[];

      it('should return only the requested point fields', async () => {
        const { status, body } = await request(url)
          .get(testRoute)
          .query({ fields: HOUSING_POINT_FIELDS.join(',') })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.length).toBeGreaterThan(0);
        expect(body).toSatisfyAll<Record<string, unknown>>((entity) =>
          Object.keys(entity).every((key) => pointFields.includes(key))
        );
        expect(body).toSatisfyAll<Record<string, unknown>>(
          (entity) => 'id' in entity && !('owner' in entity)
        );
      });

      it('should reject unknown fields with 400', async () => {
        const { status } = await request(url)
          .get(testRoute)
          .query({ fields: 'id,secretField' })
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      });

      it('should paginate deterministically across repeated and consecutive pages', async () => {
        const query = { fields: 'id', perPage: 3, page: 1 };

        const [first, second] = await Promise.all([
          request(url).get(testRoute).query(query).use(tokenProvider(user)),
          request(url).get(testRoute).query(query).use(tokenProvider(user))
        ]);
        expect(first.status).toBe(constants.HTTP_STATUS_OK);
        expect(first.body.map((h: { id: string }) => h.id)).toStrictEqual(
          second.body.map((h: { id: string }) => h.id)
        );

        const nextPage = await request(url)
          .get(testRoute)
          .query({ ...query, page: 2 })
          .use(tokenProvider(user));
        expect(nextPage.status).toBe(constants.HTTP_STATUS_OK);
        const firstIds = first.body.map((h: { id: string }) => h.id);
        const nextIds = nextPage.body.map((h: { id: string }) => h.id);
        expect(firstIds).not.toIncludeAnyMembers(nextIds);
      });
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
        kind: 'METRO'
      };
      const intercommunalityUser = genUserApi(intercommunality.id);
      const commune: EstablishmentApi = {
        ...genEstablishmentApi(
          faker.helpers.arrayElement(intercommunality.geoCodes)
        ),
        kind: 'COM'
      };
      const communeUser = genUserApi(commune.id);

      beforeAll(async () => {
        // Built synchronously above (the it.each below references them at
        // collection time), so they are persisted here via Kysely rather than
        // through the build-and-persist establishment/user factories.
        await kysely
          .insertInto('establishments')
          .values(
            [department, intercommunality, commune].map(toEstablishmentInsert)
          )
          .execute();
        await kysely
          .insertInto('users')
          .values(
            [departmentUser, intercommunalityUser, communeUser].map(
              toUserInsert
            )
          )
          .execute();

        const housings = await Promise.all(
          department.geoCodes
            .concat(intercommunality.geoCodes)
            .concat(commune.geoCodes)
            .map((geoCode) => factories.housing.create({ geoCode }))
        );
        await Promise.all(
          housings.map(async (housing) => {
            const owner = await factories.owner.create();
            await factories
              .housingOwner({ housing, owner })
              .create({ rank: 1 as OwnerRank });
          })
        );
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
          expect(body.length).toBeGreaterThan(0);
          expect(body).toSatisfyAll<HousingApi>((housing) => {
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
        expect(body.length).toBeGreaterThan(0);
        expect(body).toSatisfyAll<HousingApi>((housing) => {
          return intercommunality.geoCodes.includes(housing.geoCode);
        });
        expect(body).not.toSatisfyAny((housing: HousingApi) => {
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
        expect(body.length).toBeGreaterThan(0);
        expect(body).toSatisfyAll<HousingApi>((housing) => {
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
        expect(body.length).toBeGreaterThan(0);
        expect(body).toSatisfyAll<HousingApi>((housing) => {
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
          const housings = await Promise.all(
            payloads.map((payload) =>
              factories.housing.create({
                geoCode: faker.helpers.arrayElement(establishment.geoCodes),
                ...payload
              })
            )
          );
          await Promise.all(
            housings.map(async (housing) => {
              const owner = await factories.owner.create();
              await factories
                .housingOwner({ housing, owner })
                .create({ rank: 1 as OwnerRank });
            })
          );
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
          expect(body.length).toBeGreaterThan(0);
          expect(body).toSatisfyAll<HousingDTO>((housing) => {
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
          expect(body.length).toBeGreaterThan(0);
          expect(body).toSatisfyAll<HousingDTO>((housing) => {
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
          expect(body.length).toBeGreaterThan(0);
          expect(body).toSatisfyAll<HousingDTO>((housing) => {
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
          expect(body.length).toBeGreaterThan(0);
          expect(body).toSatisfyAll<HousingDTO>((housing) => {
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
          expect(body).toSatisfyAll<HousingDTO>((housing) => {
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
          expect(body).toSatisfyAll<HousingDTO>((housing) => {
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
      const housings = await Promise.all(
        Array.from({ length: 2 }, () =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes)
          })
        )
      );
      await Promise.all(
        housings.map(async (housing) => {
          const owner = await factories.owner.create();
          await factories
            .housingOwner({ housing, owner })
            .create({ rank: 1 as OwnerRank });
        })
      );

      const { body, status } = await request(url)
        .get(testRoute)
        .query({
          paginate: true,
          page: 1,
          perPage: 1
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toHaveLength(1);
    });

    // The list returns only housings (a bare array) and no total: computing a
    // full-set count on every request would tie each page's latency to it and
    // recompute it on every page turn. Clients read the total from
    // `GET /housings/count` instead.
    it('should return only housings, without a total', async () => {
      const housings = await Promise.all(
        Array.from({ length: 2 }, () =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes)
          })
        )
      );
      await Promise.all(
        housings.map(async (housing) => {
          const owner = await factories.owner.create();
          await factories
            .housingOwner({ housing, owner })
            .create({ rank: 1 as OwnerRank });
        })
      );

      const { body, status, headers } = await request(url)
        .get(testRoute)
        .query({ paginate: true, page: 1, perPage: 50 })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toEqual(
        expect.arrayContaining(
          housings.map((housing) => expect.objectContaining({ id: housing.id }))
        )
      );
      expect(headers['content-range']).toBeUndefined();
      expect(headers['accept-ranges']).toBeUndefined();
    });

    it('should sort housings by occupancy', async () => {
      const housings = await Promise.all(
        OCCUPANCY_VALUES.map((occupancy) =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes),
            occupancy
          })
        )
      );
      const owner = await factories.owner.create();
      await Promise.all(
        housings.map((housing) =>
          factories
            .housingOwner({ housing, owner })
            .create({ rank: 1 as OwnerRank })
        )
      );

      const { body, status } = await request(url)
        .get(testRoute)
        .query('sort=-occupancy')
        .set('Content-Type', 'application/json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toBeSortedBy('occupancy', {
        descending: true,
        compare: (a: string, b: string) =>
          a.toUpperCase().localeCompare(b.toUpperCase())
      });
    });

    // A user only ever sees housing within their allowed geo codes ∩ the
    // establishment's geo codes ∩ the `localities` filter. The intersection
    // means `localities` can only narrow the scope, never widen it beyond the
    // user's perimeter.
    describe('Perimeter (allowed geo codes ∩ establishment ∩ localities)', () => {
      // In-perimeter codes short-circuit `filterGeoCodesByPerimeter`;
      // OUTSIDE_GEO_CODE is inside the establishment but outside the user's
      // perimeter, so it is resolved against GeoAPI (mocked below).
      const IN_PERIMETER = ['75056', '13055'];
      const OUTSIDE_GEO_CODE = '69123';
      let restrictedEstablishment: EstablishmentApi;
      let restrictedUser: UserApi;

      beforeAll(async () => {
        restrictedEstablishment = await factories.establishment.create({
          geoCodes: [...IN_PERIMETER, OUTSIDE_GEO_CODE]
        });
        restrictedUser = await factories.user.create({
          establishmentId: restrictedEstablishment.id,
          role: UserRole.USUAL
        });
        await userPerimeterRepository.upsert({
          userId: restrictedUser.id,
          establishmentId: restrictedEstablishment.id,
          geoCodes: IN_PERIMETER,
          departments: [],
          regions: [],
          epci: [],
          frEntiere: false,
          updatedAt: new Date().toJSON()
        });
        // filterGeoCodesByPerimeter resolves OUTSIDE_GEO_CODE's region via
        // GeoAPI to confirm it falls outside the perimeter.
        nock('https://geo.api.gouv.fr')
          .persist()
          .get('/departements/69')
          .query({ fields: 'codeRegion' })
          .reply(200, { code: '69', nom: 'Rhône', codeRegion: '84' });

        await Promise.all(
          [...IN_PERIMETER, OUTSIDE_GEO_CODE].map((geoCode) =>
            factories.housing.create({ geoCode })
          )
        );
      });

      afterAll(() => {
        nock.cleanAll();
      });

      it('should restrict results to the user’s allowed geo codes', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .use(tokenProvider(restrictedUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.length).toBeGreaterThan(0);
        // The in-establishment-but-outside-perimeter commune is excluded even
        // without a `localities` filter.
        expect(body).toSatisfyAll<HousingApi>((housing) =>
          IN_PERIMETER.includes(housing.geoCode)
        );
      });

      it('should narrow the allowed geo codes by the localities filter', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ localities: [IN_PERIMETER[0]] })
          .use(tokenProvider(restrictedUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.length).toBeGreaterThan(0);
        expect(body).toSatisfyAll<HousingApi>(
          (housing) => housing.geoCode === IN_PERIMETER[0]
        );
      });

      it('should not let the localities filter widen beyond the perimeter', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query({ localities: [OUTSIDE_GEO_CODE] })
          .use(tokenProvider(restrictedUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toHaveLength(0);
      });
    });
  });

  describe('POST /housing', () => {
    const testRoute = '/housing';

    it('should be forbidden a non-authenticated user', async () => {
      const { status } = await request(url).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if the housing already exists', async () => {
      const housing = await factories.housing.create({
        geoCode: oneOf(establishment.geoCodes)
      });
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
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const ranks = faker.helpers.arrayElements(ACTIVE_OWNER_RANKS, 3);
      const datafoncierOwners = ranks.map((rank) =>
        genDatafoncierOwner(genIdprodroit(idprocpte, rank))
      );
      await Promise.all([
        insertDatafoncierHousing(datafoncierHousing),
        insertDatafoncierOwners(datafoncierOwners)
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
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 3);
      const existingOwners = await Promise.all(
        datafoncierOwners.map((datafoncierOwner) =>
          factories.owner.create({ idpersonne: datafoncierOwner.idpersonne })
        )
      );
      await Promise.all([
        insertDatafoncierHousing(datafoncierHousing),
        insertDatafoncierOwners(datafoncierOwners)
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
      const actualOwners = await kysely
        .selectFrom('owners')
        .innerJoin('ownersHousing', 'ownersHousing.ownerId', 'owners.id')
        .innerJoin('fastHousing', 'fastHousing.id', 'ownersHousing.housingId')
        .selectAll('owners')
        .where('fastHousing.localId', '=', datafoncierHousing.idlocal)
        .execute();
      expect(actualOwners.length).toBe(datafoncierOwners.length);
      expect(actualOwners).toSatisfyAll<Selectable<DB['owners']>>(
        (actualOwner) => {
          return existingOwners.some((existingOwner) => {
            return existingOwner.id === actualOwner.id;
          });
        }
      );
      const actualHousing = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('localId', '=', datafoncierHousing.idlocal)
        .executeTakeFirst();
      expect(actualHousing).toBeDefined();
    });

    it('should assign its owners', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 3);
      await Promise.all([
        insertDatafoncierHousing(datafoncierHousing),
        insertDatafoncierOwners(datafoncierOwners)
      ]);
      const payload = {
        localId: datafoncierHousing.idlocal
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const actual = await kysely
        .selectFrom('ownersHousing')
        .selectAll('ownersHousing')
        .where('housingGeoCode', '=', body.geoCode)
        .where('housingId', '=', body.id)
        .execute();
      expect(actual).toBeArrayOfSize(datafoncierOwners.length);
    });

    it('should create an event "housing:created"', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 1);
      await Promise.all([
        insertDatafoncierHousing(datafoncierHousing),
        insertDatafoncierOwners(datafoncierOwners)
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
      const event = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:created')
        .where('housingEvents.housingGeoCode', '=', body.geoCode)
        .where('housingEvents.housingId', '=', body.id)
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'housing:created',
        createdBy: user.id,
        nextOld: null,
        nextNew: {
          source: 'datafoncier-manual',
          occupancy: OCCUPANCY_LABELS[toOccupancy(datafoncierHousing.ccthp)]
        }
      });
    });

    it('should create an event "owner:created" for each missing owner', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 1);
      await Promise.all([
        insertDatafoncierHousing(datafoncierHousing),
        insertDatafoncierOwners(datafoncierOwners)
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

      const housingOwners = await kysely
        .selectFrom('ownersHousing')
        .selectAll('ownersHousing')
        .where('housingGeoCode', '=', body.geoCode)
        .where('housingId', '=', body.id)
        .execute();
      const events = await kysely
        .selectFrom('events')
        .innerJoin('ownerEvents', 'ownerEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'owner:created')
        .where(
          'ownerEvents.ownerId',
          'in',
          housingOwners.map((housingOwner) => housingOwner.ownerId)
        )
        .execute();
      expect(events.length).toBe(datafoncierOwners.length);
    });

    it('should create an event "housing:owner-attached" for each housing owner', async () => {
      const idprocpte = genIdprocpte(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      const building = await factories.building.create();
      const datafoncierHousing = genDatafoncierHousing(idprocpte, building.id);
      const datafoncierOwners = genDatafoncierOwners(idprocpte, 1);
      await Promise.all([
        insertDatafoncierHousing(datafoncierHousing),
        insertDatafoncierOwners(datafoncierOwners)
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
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'housingOwnerEvents',
          'housingOwnerEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:owner-attached')
        .where('housingOwnerEvents.housingGeoCode', '=', body.geoCode)
        .where('housingOwnerEvents.housingId', '=', body.id)
        .execute();
      expect(events.length).toBe(datafoncierOwners.length);
    });
  });

  describe('PUT /housing', () => {
    const testRoute = '/housing';

    interface CreateHousingsOptions {
      count?: number;
      occupancy?: Occupancy;
      occupancyIntended?: Occupancy;
      status?: HousingStatus;
      subStatus?: string | null;
    }

    async function createHousings(options?: CreateHousingsOptions) {
      const { count, ...payload } = options ?? {};
      const housings = await Promise.all(
        faker.helpers
          .multiple(() => payload, { count })
          .map((overrides) =>
            factories.housing.create({
              geoCode: faker.helpers.arrayElement(establishment.geoCodes),
              ...overrides
            })
          )
      );
      await Promise.all(
        housings.map(async (housing) => {
          const owner = await factories.owner.create();
          await factories
            .housingOwner({ housing, owner })
            .create({ rank: 1 as OwnerRank });
        })
      );
      return { housings };
    }

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).put(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    test.prop(
      [
        fc
          .record({
            filters: fc.record(
              // Reduced version because they are tested elsewhere
              {
                all: fc.boolean(),
                housingIds: fc.array(fc.uuid({ version: 4 }))
              },
              { requiredKeys: [] }
            ),
            occupancy: fc.option(fc.constantFrom(...OCCUPANCY_VALUES), {
              nil: undefined
            }),
            occupancyIntended: fc.option(fc.constantFrom(...OCCUPANCY_VALUES), {
              nil: undefined
            }),
            note: fc.option(fc.stringMatching(/\S/), { nil: undefined })
          })
          .chain((base) =>
            fc
              .oneof(
                fc.constant({
                  status: undefined as HousingStatus | undefined,
                  subStatus: undefined as string | undefined
                }),
                fc
                  .constantFrom(
                    HousingStatus.NEVER_CONTACTED,
                    HousingStatus.WAITING
                  )
                  .map((status) => ({
                    status,
                    subStatus: undefined as string | undefined
                  })),
                fc
                  .constantFrom(
                    HousingStatus.FIRST_CONTACT,
                    HousingStatus.IN_PROGRESS,
                    HousingStatus.COMPLETED,
                    HousingStatus.BLOCKED
                  )
                  .chain((status) => {
                    const validSubs = [...getSubStatuses(status)];
                    // A sub-status-requiring status must always carry a
                    // valid sub-status.
                    return fc
                      .constantFrom(...validSubs)
                      .map((subStatus) => ({ status, subStatus }));
                  })
              )
              .map((ss) => ({ ...base, ...ss }))
          )
      ],
      { verbose: true, numRuns: 20 }
    )('should validate inputs', async (payload) => {
      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should return 400 when the sub-status is invalid for the given status', async () => {
      const payload: HousingBatchUpdatePayload = {
        filters: { all: false },
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'invalid-sub-status'
      };

      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return 400 when the status requires a sub-status but none is provided', async () => {
      const payload: HousingBatchUpdatePayload = {
        filters: { all: false },
        status: HousingStatus.IN_PROGRESS
      };

      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return 400 when a sub-status is provided without a status', async () => {
      const payload: HousingBatchUpdatePayload = {
        filters: { all: false },
        subStatus: null
      };

      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should be forbidden to set status "NeverContacted" for housings that have already been contacted', async () => {
      const { housings } = await createHousings({
        status: HousingStatus.WAITING
      });
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .insertInto('campaignsHousing')
        .values(
          housings.map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
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

      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where((eb) =>
          eb(
            eb.refTuple('geoCode', 'id'),
            'in',
            housings.map((housing) => eb.tuple(housing.geoCode, housing.id))
          )
        )
        .execute();
      expect(actual).toBeDefined();
      actual.forEach((housing) => {
        expect(housing).toMatchObject<Partial<Selectable<DB['fastHousing']>>>({
          status: payload.status,
          occupancy: payload.occupancy
        });
      });
    });

    it('should remove the substatus correctly', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes),
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'En accompagnement'
      });

      const payload: HousingBatchUpdatePayload = {
        filters: {
          all: false,
          housingIds: [housing.id]
        },
        status: HousingStatus.WAITING
        // subStatus should become null
        // because it is not valid for the new status
      };

      const { body, status } = await request(url)
        .put(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('geoCode', '=', housing.geoCode)
        .where('id', '=', housing.id)
        .executeTakeFirst();
      expect(actual).toMatchObject<Partial<Selectable<DB['fastHousing']>>>({
        subStatus: null
      });
      expect(body).toPartiallyContain<Partial<HousingDTO>>({
        id: housing.id,
        status: payload.status,
        subStatus: null
      });
    });

    it('should not touch the sub-status nor create a status event when only a note is added', async () => {
      const { housings } = await createHousings({
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'En accompagnement'
      });
      const payload: HousingBatchUpdatePayload = {
        filters: {
          all: false,
          housingIds: housings.map((housing) => housing.id)
        },
        note: 'Une note ajoutee sans changement de statut'
      };

      const { status } = await request(url)
        .put(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where((eb) =>
          eb(
            eb.refTuple('geoCode', 'id'),
            'in',
            housings.map((housing) => eb.tuple(housing.geoCode, housing.id))
          )
        )
        .execute();
      actual.forEach((housing) => {
        expect(housing).toMatchObject<Partial<Selectable<DB['fastHousing']>>>({
          status: HousingStatus.IN_PROGRESS,
          subStatus: 'En accompagnement'
        });
      });
      const events = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where((eb) =>
          eb.or(
            housings.map((housing) =>
              eb.and([
                eb('housingEvents.housingGeoCode', '=', housing.geoCode),
                eb('housingEvents.housingId', '=', housing.id)
              ])
            )
          )
        )
        .where('events.type', '=', 'housing:status-updated')
        .execute();
      expect(events).toEqual([]);
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
      const events = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where((eb) =>
          eb.or(
            housings.map((housing) =>
              eb.and([
                eb('housingEvents.housingGeoCode', '=', housing.geoCode),
                eb('housingEvents.housingId', '=', housing.id)
              ])
            )
          )
        )
        .where('events.type', '=', 'housing:status-updated')
        .execute();
      events.forEach((event) => {
        expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
          type: 'housing:status-updated',
          nextOld: {
            status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED],
            subStatus: null
          },
          nextNew: {
            status: HOUSING_STATUS_LABELS[payload.status!],
            subStatus: payload.subStatus!
          },
          createdBy: user.id
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
      const events = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where((eb) =>
          eb.or(
            housings.map((housing) =>
              eb.and([
                eb('housingEvents.housingGeoCode', '=', housing.geoCode),
                eb('housingEvents.housingId', '=', housing.id)
              ])
            )
          )
        )
        .where('events.type', '=', 'housing:occupancy-updated')
        .execute();
      events.forEach((event) => {
        expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
          type: 'housing:occupancy-updated',
          createdBy: user.id,
          nextOld: {
            occupancy: OCCUPANCY_LABELS[Occupancy.VACANT],
            occupancyIntended: OCCUPANCY_LABELS[Occupancy.VACANT]
          },
          nextNew: {
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

      const actual = await kysely
        .selectFrom('notes')
        .innerJoin('housingNotes', 'housingNotes.noteId', 'notes.id')
        .selectAll('notes')
        .where((eb) =>
          eb.or(
            housings.map((housing) =>
              eb.and([
                eb('housingNotes.housingGeoCode', '=', housing.geoCode),
                eb('housingNotes.housingId', '=', housing.id)
              ])
            )
          )
        )
        .execute();
      actual.forEach((note) => {
        expect(note).toMatchObject<Partial<Selectable<DB['notes']>>>({
          content: 'Nouvelle note'
        });
      });
    });

    it('should add precisions to multiple housings', async () => {
      const { housings } = await createHousings({
        count: 2
      });
      const allPrecisions = await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute();
      const precisions = faker.helpers.arrayElements(allPrecisions, 2);

      const { body, status } = await request(url)
        .put('/housing')
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
      const links = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where((eb) =>
          eb.or(
            housings.map((housing) =>
              eb.and([
                eb('housingGeoCode', '=', housing.geoCode),
                eb('housingId', '=', housing.id)
              ])
            )
          )
        )
        .execute();
      expect(links).toHaveLength(4); // 2 housings * 2 precisions
    });

    it('should create events related to the precision changes', async () => {
      const { housings } = await createHousings({
        count: 2
      });
      const allPrecisions = await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute();
      const precisions = faker.helpers.arrayElements(allPrecisions, 2);

      const { status } = await request(url)
        .put('/housing')
        .send({
          filters: {
            housingIds: housings.map((housing) => housing.id)
          },
          precisions: precisions.map((precision) => precision.id)
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'precisionHousingEvents',
          'precisionHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:precision-attached')
        .where((eb) =>
          eb.or(
            housings.map((housing) =>
              eb.and([
                eb(
                  'precisionHousingEvents.housingGeoCode',
                  '=',
                  housing.geoCode
                ),
                eb('precisionHousingEvents.housingId', '=', housing.id)
              ])
            )
          )
        )
        .execute();
      expect(events).toHaveLength(4); // 2 housings * 2 precisions
    });

    it('should not create events for existing precision links', async () => {
      const { housings } = await createHousings({
        count: 1
      });
      const [housing] = housings;
      const allPrecisions = await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute();
      const precisions = faker.helpers.arrayElements(allPrecisions, 2);

      // First, add the precisions
      await kysely
        .insertInto('housingPrecisions')
        .values(
          precisions.map((precision) => ({
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            precisionId: precision.id,
            createdAt: new Date()
          }))
        )
        .execute();
      // Create related events
      const events = precisions.map((precision) =>
        genEventApi({
          type: 'housing:precision-attached',
          nextOld: null,
          nextNew: {
            category: precision.category as PrecisionCategory,
            label: precision.label
          },
          creator: user
        })
      );
      await kysely
        .insertInto('events')
        .values(events.map(toEventInsert))
        .execute();
      await kysely
        .insertInto('precisionHousingEvents')
        .values(
          events.map((event) => ({
            eventId: event.id,
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            precisionId: null
          }))
        )
        .execute();

      // Add the same precisions again via API
      const { status } = await request(url)
        .put('/housing')
        .send({
          filters: {
            housingIds: [housing.id]
          },
          precisions: precisions.map((precision) => precision.id)
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      // Should still have only the original 2 precision links
      const links = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
      expect(links).toHaveLength(2);

      // Should have no new events
      const eventsAgain = await kysely
        .selectFrom('events')
        .innerJoin(
          'precisionHousingEvents',
          'precisionHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:precision-attached')
        .where('precisionHousingEvents.housingGeoCode', '=', housing.geoCode)
        .where('precisionHousingEvents.housingId', '=', housing.id)
        .execute();
      expect(eventsAgain).toHaveLength(housings.length * precisions.length);
    });

    it('should add only new precisions (add-only mode)', async () => {
      const { housings } = await createHousings({
        count: 1
      });
      const [housing] = housings;
      const allPrecisions = await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute();
      const existingPrecisions = faker.helpers.arrayElements(allPrecisions, 2);
      const newPrecisions = faker.helpers.arrayElements(
        allPrecisions.filter(
          (p) => !existingPrecisions.some((ep) => ep.id === p.id)
        ),
        1
      );

      // Add initial precisions
      await kysely
        .insertInto('housingPrecisions')
        .values(
          existingPrecisions.map((precision) => ({
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            precisionId: precision.id,
            createdAt: new Date()
          }))
        )
        .execute();

      const { status } = await request(url)
        .put('/housing')
        .send({
          filters: {
            housingIds: [housing.id]
          },
          precisions: newPrecisions.map((precision) => precision.id)
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const links = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
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
      const allPrecisions = await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .execute();
      const travaux = allPrecisions.filter(
        (precision) => precision.category === 'travaux'
      );
      const initialPrecisions = [
        {
          housingGeoCode: housings[0].geoCode,
          housingId: housings[0].id,
          precisionId: travaux[0].id,
          createdAt: new Date()
        },
        {
          housingGeoCode: housings[1].geoCode,
          housingId: housings[1].id,
          precisionId: travaux[1].id,
          createdAt: new Date()
        }
      ];
      const newPrecision = travaux[1];

      // Add initial precision
      await kysely
        .insertInto('housingPrecisions')
        .values(initialPrecisions)
        .execute();

      const { status } = await request(url)
        .put('/housing')
        .send({
          filters: {
            housingIds: housings.map((housing) => housing.id)
          },
          precisions: [newPrecision.id]
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await kysely
        .selectFrom('housingPrecisions')
        .selectAll('housingPrecisions')
        .where((eb) =>
          eb.or(
            housings.map((housing) =>
              eb.and([
                eb('housingGeoCode', '=', housing.geoCode),
                eb('housingId', '=', housing.id)
              ])
            )
          )
        )
        .execute();
      expect(actual).toHaveLength(2);
      expect(actual).toIncludeAllPartialMembers([
        {
          housingGeoCode: housings[0].geoCode,
          housingId: housings[0].id,
          precisionId: newPrecision.id
        },
        {
          housingGeoCode: housings[1].geoCode,
          housingId: housings[1].id,
          precisionId: newPrecision.id
        }
      ]);
    });

    it('should link documents to multiple housings in batch update', async () => {
      const { housings } = await createHousings({ count: 2 });
      const document = genDocumentApi({
        createdBy: user.id,
        creator: user,
        establishmentId: establishment.id
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status, body } = await request(url)
        .put(testRoute)
        .send({
          filters: {
            establishmentIds: [establishment.id],
            housingIds: housings.map((housing) => housing.id)
          },
          documents: [document.id],
          status: HousingStatus.IN_PROGRESS,
          subStatus: 'En accompagnement'
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toHaveLength(2);

      // Verify both housings have the document linked
      const actual = await kysely
        .selectFrom('documentsHousings')
        .selectAll('documentsHousings')
        .where('documentId', '=', document.id)
        .execute();
      expect(actual).toHaveLength(2);
      expect(actual).toIncludeAllPartialMembers<
        Selectable<DB['documentsHousings']>
      >([
        {
          housingGeoCode: housings[0].geoCode,
          housingId: housings[0].id,
          documentId: document.id
        },
        {
          housingGeoCode: housings[1].geoCode,
          housingId: housings[1].id,
          documentId: document.id
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
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const { status, body } = await request(url)
        .put(testRoute)
        .send({
          filters: {
            establishmentIds: [establishment.id],
            housingIds: [housings[0].id]
          },
          status: HousingStatus.IN_PROGRESS,
          subStatus: 'En accompagnement',
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
          subStatus: 'En accompagnement',
          documents: []
        } satisfies HousingBatchUpdatePayload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
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

      it('should only update housing within the intercommunalities filter', async () => {
        const [insideHousing, outsideHousing] = await Promise.all([
          factories.housing.create({
            geoCode: intercommunality.geoCodes[0],
            status: HousingStatus.NEVER_CONTACTED
          }),
          factories.housing.create({
            geoCode: scopedEstablishment.geoCodes[1],
            status: HousingStatus.NEVER_CONTACTED
          })
        ]);
        await Promise.all(
          [insideHousing, outsideHousing].map(async (housing) => {
            const owner = await factories.owner.create();
            await factories
              .housingOwner({ housing, owner })
              .create({ rank: 1 as OwnerRank });
          })
        );

        const { status, body } = await request(url)
          .put(testRoute)
          .send({
            filters: { intercommunalities: [intercommunality.id] },
            status: HousingStatus.WAITING
          } satisfies HousingBatchUpdatePayload)
          .use(tokenProvider(scopedUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toSatisfyAny(
          (housing: HousingApi) =>
            housing.id === insideHousing.id &&
            housing.status === HousingStatus.WAITING
        );
        expect(body).not.toSatisfyAny(
          (housing: HousingApi) => housing.id === outsideHousing.id
        );

        const { body: untouched } = await request(url)
          .get(`/housing/${outsideHousing.id}`)
          .use(tokenProvider(scopedUser));
        expect(untouched.status).toBe(HousingStatus.NEVER_CONTACTED);
      });

      it('should not widen an explicit empty localities selection to the whole perimeter', async () => {
        const housing = await factories.housing.create({
          geoCode: scopedEstablishment.geoCodes[1],
          status: HousingStatus.NEVER_CONTACTED
        });
        const owner = await factories.owner.create();
        await factories
          .housingOwner({ housing, owner })
          .create({ rank: 1 as OwnerRank });

        const { status, body } = await request(url)
          .put(testRoute)
          .send({
            filters: { localities: [] },
            status: HousingStatus.WAITING
          } satisfies HousingBatchUpdatePayload)
          .use(tokenProvider(scopedUser));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toHaveLength(0);

        const { body: untouched } = await request(url)
          .get(`/housing/${housing.id}`)
          .use(tokenProvider(scopedUser));
        expect(untouched.status).toBe(HousingStatus.NEVER_CONTACTED);
      });
    });
  });

  describe('PUT /housing/{id}', () => {
    const testRoute = (id: string) => `/housing/${id}`;
    const defaultPayload: HousingUpdatePayloadDTO = {
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: null,
      occupancy: Occupancy.VACANT,
      occupancyIntended: null,
      actualEnergyConsumption: null
    };

    async function createHousing(
      options?: Partial<Pick<HousingApi, keyof HousingUpdatePayloadDTO>>
    ) {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes),
        ...options
      });
      const owner = await factories.owner.create();
      await factories
        .housingOwner({ housing, owner })
        .create({ rank: 1 as OwnerRank });
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
        subStatus: 'Sortie de la vacance',
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.RENT,
        actualEnergyConsumption: null
      };

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('id', '=', housing.id)
        .executeTakeFirst();
      expect(actual).toMatchObject<Partial<Selectable<DB['fastHousing']>>>({
        id: housing.id,
        status: payload.status,
        subStatus: payload.subStatus,
        occupancy: payload.occupancy,
        occupancyIntended: payload.occupancyIntended
      });
    });

    it.each([HousingStatus.NEVER_CONTACTED, HousingStatus.WAITING])(
      `should force the sub-status to null when the status becomes %s`,
      async (statusAfter) => {
        const housing = await createHousing({
          status: HousingStatus.COMPLETED,
          subStatus: 'Sortie de la vacance',
          occupancy: Occupancy.RENT,
          occupancyIntended: null
        });
        const payload: HousingUpdatePayloadDTO = {
          status: statusAfter,
          subStatus: housing.subStatus,
          occupancy: housing.occupancy,
          occupancyIntended: housing.occupancyIntended,
          actualEnergyConsumption: housing.actualEnergyConsumption
        };

        const { body, status } = await request(url)
          .put(testRoute(housing.id))
          .send(payload)
          .type('json')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body.subStatus).toBeNull();
        const actual = await kysely
          .selectFrom('fastHousing')
          .selectAll('fastHousing')
          .where('geoCode', '=', housing.geoCode)
          .where('id', '=', housing.id)
          .executeTakeFirst();
        expect(actual).toMatchObject<Partial<Selectable<DB['fastHousing']>>>({
          id: housing.id,
          status: payload.status,
          subStatus: null
        });
      }
    );

    it('should return 400 when the sub-status is invalid for the given status', async () => {
      const housing = await createHousing();
      const payload: HousingUpdatePayloadDTO = {
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'invalid-sub-status',
        occupancy: Occupancy.VACANT,
        occupancyIntended: null,
        actualEnergyConsumption: null
      };

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should not create events if there is no change', async () => {
      const housing = await createHousing({
        status: HousingStatus.COMPLETED,
        subStatus: 'Sortie de la vacance',
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.RENT
      });
      const payload: HousingUpdatePayloadDTO = {
        status: housing.status,
        subStatus: housing.subStatus,
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended,
        actualEnergyConsumption: housing.actualEnergyConsumption
      };

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await kysely
        .selectFrom('housingEvents')
        .selectAll('housingEvents')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
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
        subStatus: 'En accompagnement',
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended,
        actualEnergyConsumption: null
      };

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('housingEvents.housingId', '=', housing.id)
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('events.type', '=', 'housing:status-updated')
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'housing:status-updated',
        nextOld: {
          status: HOUSING_STATUS_LABELS[housing.status],
          subStatus: housing.subStatus
        },
        nextNew: {
          status: HOUSING_STATUS_LABELS[payload.status],
          subStatus: payload.subStatus
        },
        createdBy: user.id
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
        occupancyIntended: Occupancy.DEMOLISHED_OR_DIVIDED,
        actualEnergyConsumption: null
      };

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .where('events.type', '=', 'housing:occupancy-updated')
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'housing:occupancy-updated',
        nextOld: {
          occupancy: OCCUPANCY_LABELS[housing.occupancy],
          occupancyIntended: OCCUPANCY_LABELS[housing.occupancyIntended!]
        },
        nextNew: {
          occupancy: OCCUPANCY_LABELS[payload.occupancy],
          occupancyIntended: OCCUPANCY_LABELS[payload.occupancyIntended!]
        },
        createdBy: user.id
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
        occupancyIntended: Occupancy.RENT,
        actualEnergyConsumption: null
      };

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const statusEvent = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .where('events.type', '=', 'housing:status-updated')
        .executeTakeFirst();
      expect(statusEvent).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'housing:status-updated',
        nextOld: {
          status: HOUSING_STATUS_LABELS[housing.status]
        },
        nextNew: {
          status: HOUSING_STATUS_LABELS[payload.status]
        },
        createdBy: user.id
      });
      const occupancyEvent = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .where('events.type', '=', 'housing:occupancy-updated')
        .executeTakeFirst();
      expect(occupancyEvent).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'housing:occupancy-updated',
        nextOld: {
          occupancyIntended: OCCUPANCY_LABELS[housing.occupancyIntended!]
        },
        nextNew: {
          occupancyIntended: OCCUPANCY_LABELS[payload.occupancyIntended!]
        },
        createdBy: user.id
      });
    });

    it('should update the actual energy consumption', async () => {
      const housing = await createHousing({
        actualEnergyConsumption: 'D'
      });
      const payload: HousingUpdatePayloadDTO = {
        status: housing.status,
        subStatus: housing.subStatus,
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended,
        actualEnergyConsumption: 'B'
      };

      const { body, status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDTO>>({
        id: housing.id,
        actualEnergyConsumption: 'B'
      });

      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('id', '=', housing.id)
        .executeTakeFirst();
      expect(actual).toMatchObject<Partial<Selectable<DB['fastHousing']>>>({
        id: housing.id,
        actualDpe: 'B'
      });
    });

    it('should create an event when actual energy consumption changes', async () => {
      const housing = await createHousing({
        actualEnergyConsumption: 'E'
      });
      const payload: HousingUpdatePayloadDTO = {
        status: housing.status,
        subStatus: housing.subStatus,
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended,
        actualEnergyConsumption: 'C'
      };

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .where('events.type', '=', 'housing:updated')
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'housing:updated',
        nextOld: {
          actualEnergyConsumption: 'E'
        },
        nextNew: {
          actualEnergyConsumption: 'C'
        },
        createdBy: user.id
      });
    });

    it('should not create an event when actual energy consumption does not change', async () => {
      const housing = await createHousing({
        actualEnergyConsumption: 'C'
      });
      const payload: HousingUpdatePayloadDTO = {
        status: housing.status,
        subStatus: housing.subStatus,
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended,
        actualEnergyConsumption: 'C'
      };

      const { status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const events = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .where('events.type', '=', 'housing:updated')
        .execute();
      expect(events).toHaveLength(0);
    });

    it('should set actual energy consumption to null', async () => {
      const housing = await createHousing({
        actualEnergyConsumption: 'F'
      });
      const payload: HousingUpdatePayloadDTO = {
        status: housing.status,
        subStatus: housing.subStatus,
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended,
        actualEnergyConsumption: null
      };

      const { body, status } = await request(url)
        .put(testRoute(housing.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<HousingDTO>>({
        id: housing.id,
        actualEnergyConsumption: null
      });

      const event = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .where('events.type', '=', 'housing:updated')
        .executeTakeFirst();
      expect(event).toMatchObject<Partial<Selectable<DB['events']>>>({
        type: 'housing:updated',
        nextOld: {
          actualEnergyConsumption: 'F'
        },
        nextNew: {
          actualEnergyConsumption: null
        },
        createdBy: user.id
      });
    });
  });
});
