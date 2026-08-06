import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import {
  AddressKinds,
  BENEFIARY_COUNT_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  CampaignDTO,
  DataFileYear,
  ENERGY_CONSUMPTION_VALUES,
  fromHousing,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES,
  isActiveOwnerRank,
  LastMutationTypeFilter,
  LastMutationYearFilter,
  Occupancy,
  OCCUPANCY_VALUES,
  OWNER_KIND_LABELS,
  OWNER_KIND_VALUES,
  OwnerAge,
  OwnerRank,
  OwnershipKind,
  Precision,
  READ_ONLY_OCCUPANCY_VALUES,
  READ_WRITE_OCCUPANCY_VALUES,
  RELATIVE_LOCATION_VALUES,
  ROOM_COUNT_VALUES,
  type RelativeLocationFilter,
  type VacancyYear
} from '@zerologementvacant/models';
import { genGeoCode } from '@zerologementvacant/models/fixtures';
import { isDefined } from '@zerologementvacant/utils';
import async from 'async';
import { differenceInYears, endOfYear } from 'date-fns';
import { Array, Predicate, Record } from 'effect';
import { flow } from 'effect/Function';
import fp from 'lodash/fp';
import { match } from 'ts-pattern';

import { kysely } from '~/infra/database/kysely';
import { AddressApi } from '~/models/AddressApi';
import { BuildingApi } from '~/models/BuildingApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { LocalityApi } from '~/models/LocalityApi';
import { OwnerApi } from '~/models/OwnerApi';
import { toAddressInsert } from '~/repositories/banAddressesRepository';
import { toGeoPerimeterInsert } from '~/repositories/geoRepository';
import { factories } from '~/test/factories';
import {
  genAddressApi,
  genBuildingApi,
  genEstablishmentApi,
  genGeoPerimeterApi,
  genHousingApi,
  genLocalityApi,
  genOwnerApi,
  genUserApi,
  manyOf,
  oneOf
} from '~/test/testFixtures';

import { toEstablishmentInsert } from '../establishmentRepository';
import { relativeLocationFilterToDBO } from '../housingOwnerRepository';
import housingRepository, {
  ReferenceDataYear,
  toHousingInsert
} from '../housingRepository';
import { toLocalityInsert } from '../localityRepository';
import { refreshMultiOwnerFlags } from '../ownerRepository';
import { toUserInsert } from '../userRepository';

describe('Housing repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await kysely
      .insertInto('establishments')
      .values(toEstablishmentInsert(establishment))
      .execute();
    await kysely.insertInto('users').values(toUserInsert(user)).execute();
  });

  describe('find', () => {
    it('should return empty array when localities is an empty array', async () => {
      const result = await housingRepository.find({
        filters: { localities: [] }
      });

      expect(result).toBeArrayOfSize(0);
    });

    it('should return housings that have no main owner', async () => {
      const housing = await factories.housing.create();

      const housings = await housingRepository.find({
        filters: {
          housingIds: [housing.id]
        },
        includes: ['owner']
      });

      expect(housings).toSatisfyAny((housing) => !housing.owner);
    });

    it('should sort by geo code and id by default', async () => {
      const actual = await housingRepository.find({
        filters: {}
      });

      expect(actual).toBeSortedBy('geoCode');
    });

    it('should include owner on demand', async () => {
      const actual = await housingRepository.find({
        filters: {},
        includes: ['owner']
      });

      expect(actual).toSatisfyAll((housing) => housing.owner !== undefined);
    });

    it('should include owner if needed by a filter', async () => {
      const housings = await factories.housing.createList(3);
      const owners = await factories.owner.createList(3);
      await Promise.all(
        housings.map((housing) =>
          factories
            .housingOwner({
              housing,
              owner: faker.helpers.arrayElement(owners)
            })
            .create({ rank: 1 })
        )
      );
      const owner = owners[0];

      const actual = await housingRepository.find({
        filters: {
          ownerIds: [owner.id]
        }
      });

      expect(actual).toSatisfyAll<HousingApi>(
        (housing) => housing.owner?.id === owner.id
      );
    });

    it('should include owner only once', async () => {
      const housings = await factories.housing.createList(3);
      const owner = await factories.owner.create();
      await Promise.all(
        housings.map((housing) =>
          factories.housingOwner({ housing, owner }).create({ rank: 1 })
        )
      );

      const actual = await housingRepository.find({
        filters: {
          ownerIds: [owner.id]
        },
        includes: ['owner']
      });

      expect(actual).toSatisfyAll<HousingApi>(
        (housing) => housing.owner?.id === owner.id
      );
    });

    it('should include precisions on demand', async () => {
      const precisions = (await kysely
        .selectFrom('precisions')
        .selectAll('precisions')
        .limit(3)
        .execute()) as Precision[];
      const housings: HousingApi[] = await factories.housing.createList(3);
      await kysely
        .insertInto('housingPrecisions')
        .values(
          precisions.flatMap((precision) =>
            housings.map((housing) => ({
              housingGeoCode: housing.geoCode,
              housingId: housing.id,
              precisionId: precision.id,
              createdAt: new Date()
            }))
          )
        )
        .execute();

      const actual = await housingRepository.find({
        filters: {
          housingIds: housings.map((housing) => housing.id)
        },
        includes: ['precisions']
      });

      expect(actual).toSatisfyAll<HousingApi>((housing) => {
        return housing.precisions ? housing.precisions.length > 0 : false;
      });
    });

    describe('Filters', () => {
      it('should filter by housing ids', async () => {
        const houses: HousingApi[] = await Promise.all([
          ...faker.helpers.multiple(
            () =>
              factories.housing.create({
                geoCode: faker.helpers.arrayElement(establishment.geoCodes)
              }),
            { count: 4 }
          ),
          // Should not return this one
          factories.housing.create()
        ]);

        const actual = await housingRepository.find({
          filters: {
            all: false,
            housingIds: houses.slice(0, 1).map((housing) => housing.id)
          }
        });

        expect(actual.length).toBeGreaterThanOrEqual(1);
        expect(actual).toSatisfyAll<HousingApi>((actualHousing) => {
          return houses.map((housing) => housing.id).includes(actualHousing.id);
        });
      });

      it('should exclude housing ids', async () => {
        const housings: HousingApi[] = await factories.housing.createList(4);
        const includedHousings = housings.slice(0, 1);
        const excludedHousings = housings.slice(1);

        const actual = await housingRepository.find({
          filters: {
            all: true,
            housingIds: excludedHousings.map((housing) => housing.id)
          },
          pagination: {
            paginate: false
          }
        });

        const actualIds = actual.map((actual) => actual.id);
        const includedHousingIds = includedHousings.map(
          (housing) => housing.id
        );
        const excludedHousingIds = excludedHousings.map(
          (housing) => housing.id
        );
        expect(actualIds).toIncludeAllMembers(includedHousingIds);
        expect(actualIds).not.toIncludeAnyMembers(excludedHousingIds);
      });

      describe('by intercommunality', () => {
        let intercommunality: EstablishmentApi;

        beforeEach(async () => {
          const geoCodes = faker.helpers.multiple(() => genGeoCode(), {
            count: 3
          });
          intercommunality = {
            ...genEstablishmentApi(...geoCodes),
            name: 'Eurométropole de Strasbourg',
            kind: 'METRO'
          };

          await kysely
            .insertInto('establishments')
            .values(toEstablishmentInsert(intercommunality))
            .execute();
          const housings: HousingApi[] = await Promise.all([
            ...faker.helpers.multiple(
              () =>
                factories.housing.create({
                  geoCode: faker.helpers.arrayElement(geoCodes)
                }),
              { count: 3 }
            ),
            ...faker.helpers.multiple(() => factories.housing.create(), {
              count: 3
            })
          ]);
          const owner = await factories.owner.create();
          await Promise.all(
            housings.map((housing) =>
              factories.housingOwner({ housing, owner }).create({ rank: 1 })
            )
          );
        });

        it('should filter by intercommunality', async () => {
          const actual = await housingRepository.find({
            filters: {
              intercommunalities: [intercommunality.id]
            }
          });

          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return intercommunality.geoCodes.includes(housing.geoCode);
          });
        });
      });

      describe('by occupancy', () => {
        beforeEach(async () => {
          const housings: HousingApi[] = await Promise.all(
            OCCUPANCY_VALUES.map((occupancy) =>
              factories.housing.create({ occupancy })
            )
          );
          const owner = await factories.owner.create();
          await Promise.all(
            housings.map((housing) =>
              factories.housingOwner({ housing, owner }).create({ rank: 1 })
            )
          );
        });

        test.each(
          READ_WRITE_OCCUPANCY_VALUES.filter(
            (occupancy) => occupancy !== Occupancy.OTHERS
          )
        )('should filter by %s', async (occupancy) => {
          const actual = await housingRepository.find({
            filters: {
              occupancies: [occupancy]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(
            (housing) => housing.occupancy === occupancy
          );
        });

        it('should keep housings that have a read-only occupancy', async () => {
          const actual = await housingRepository.find({
            filters: {
              occupancies: [Occupancy.OTHERS]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return (
              housing.occupancy === Occupancy.OTHERS ||
              READ_ONLY_OCCUPANCY_VALUES.includes(housing.occupancy)
            );
          });
          READ_ONLY_OCCUPANCY_VALUES.forEach((occupancy) => {
            expect(actual).toSatisfyAny((housing: HousingApi) => {
              return housing.occupancy === occupancy;
            });
          });
        });
      });

      describe('by energy consumption', () => {
        it('should keep housings that have no energy consumption filled on their building', async () => {
          const building: BuildingApi = {
            ...genBuildingApi(),
            dpe: null
          };
          await factories.building.create(building);
          const housing: HousingApi = genHousingApi(undefined, building);
          await factories.housing.create(housing);

          const actual = await housingRepository.find({
            filters: {
              energyConsumption: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          const buildings = await kysely
            .selectFrom('buildings')
            .selectAll('buildings')
            .where(
              'id',
              'in',
              actual.map((housing) => housing.buildingId).filter(isDefined)
            )
            .execute();
          expect(buildings).toSatisfyAll((building) => {
            return building.classDpe === null;
          });
        });

        it.each([null, ...ENERGY_CONSUMPTION_VALUES])(
          'should filter by a single building DPE = %s',
          async (energyConsumption) => {
            const building: BuildingApi = genBuildingApi({
              hasEnergyConsumption: energyConsumption !== null
            });
            if (building.dpe && energyConsumption !== null) {
              building.dpe.class = energyConsumption;
            }
            await factories.building.create(building);
            const housing = genHousingApi(undefined, building);
            await factories.housing.create(housing);

            const actual = await housingRepository.find({
              filters: {
                energyConsumption: [energyConsumption]
              }
            });

            const buildings = await kysely
              .selectFrom('buildings')
              .selectAll('buildings')
              .where(
                'id',
                'in',
                actual.map((housing) => housing.buildingId).filter(isDefined)
              )
              .execute();
            expect(buildings).toSatisfyAll((building) => {
              return building.classDpe === energyConsumption;
            });
          }
        );

        it('should filter by a several building DPE', async () => {
          const energyConsumptions = faker.helpers.arrayElements([
            null,
            ...ENERGY_CONSUMPTION_VALUES
          ]);
          const buildings: BuildingApi[] = energyConsumptions.map(
            (energyConsumption) => {
              const building = genBuildingApi({
                hasEnergyConsumption: energyConsumption !== null
              });
              if (building.dpe && energyConsumption !== null) {
                building.dpe.class = energyConsumption;
              }
              return building;
            }
          );
          await Promise.all(
            buildings.map((building) => factories.building.create(building))
          );
          const housings = buildings.map((building) =>
            genHousingApi(undefined, building)
          );
          await Promise.all(
            housings.map((housing) => factories.housing.create(housing))
          );

          const actual = await housingRepository.find({
            filters: {
              energyConsumption: energyConsumptions
            }
          });

          const actualBuildings = await kysely
            .selectFrom('buildings')
            .selectAll('buildings')
            .where(
              'id',
              'in',
              actual.map((housing) => housing.buildingId).filter(isDefined)
            )
            .execute();
          expect(actualBuildings).toSatisfyAll((building) => {
            return energyConsumptions.includes(
              building.classDpe as (typeof energyConsumptions)[number]
            );
          });
        });
      });

      it('should filter by establishment', async () => {
        const otherEstablishment = genEstablishmentApi();
        await kysely
          .insertInto('establishments')
          .values(toEstablishmentInsert(otherEstablishment))
          .execute();
        await Promise.all([
          factories.housing.create({ geoCode: oneOf(establishment.geoCodes) }),
          factories.housing.create({
            geoCode: oneOf(otherEstablishment.geoCodes)
          })
        ]);

        const actual = await housingRepository.find({
          filters: {
            establishmentIds: [establishment.id]
          }
        });

        expect(actual).toSatisfyAll<HousingApi>((housing) =>
          establishment.geoCodes.includes(housing.geoCode)
        );
      });

      it('should filter by group', async () => {
        const groups = await factories
          .group(establishment)
          .createList(2, {}, { associations: { createdBy: user } });
        const housesByGroup = fp.fromPairs(
          await Promise.all(
            groups.map(async (group) => {
              const houses: HousingApi[] = await Promise.all(
                faker.helpers.multiple(
                  () =>
                    factories.housing.create({
                      geoCode: oneOf(establishment.geoCodes)
                    }),
                  { count: 3 }
                )
              );
              return [group.id, houses] as [string, HousingApi[]];
            })
          )
        );
        await kysely
          .insertInto('groupsHousing')
          .values(
            groups.flatMap((group) =>
              manyOf(
                housesByGroup[group.id],
                faker.number.int({ min: 1, max: 3 })
              ).map((housing) => ({
                groupId: group.id,
                housingId: housing.id,
                housingGeoCode: housing.geoCode
              }))
            )
          )
          .execute();
        const [firstGroup] = groups;

        const actual = await housingRepository.find({
          filters: {
            groupIds: [firstGroup.id]
          }
        });

        expect(actual).toSatisfyAll<HousingApi>((actualHousing) => {
          return housesByGroup[firstGroup.id]
            .map((housing) => housing.id)
            .includes(actualHousing.id);
        });
      });

      describe('by campaign id', () => {
        let campaigns: ReadonlyArray<CampaignDTO>;

        beforeEach(async () => {
          campaigns = await factories
            .campaign(establishment)
            .createList(3, {}, { associations: { createdBy: user } });
          const campaignHousings = await Promise.all(
            campaigns.map(async (campaign) => {
              return {
                campaign,
                housings: await Promise.all(
                  faker.helpers.multiple(() => factories.housing.create(), {
                    count: 3
                  })
                )
              };
            })
          );
          await kysely
            .insertInto('campaignsHousing')
            .values(
              campaignHousings.flatMap((ch) =>
                ch.housings.map((housing) => ({
                  campaignId: ch.campaign.id,
                  housingId: housing.id,
                  housingGeoCode: housing.geoCode
                }))
              )
            )
            .execute();
        });

        it('should keep housings that are not in a campaign', async () => {
          await factories.housing.create();

          const actual = await housingRepository.find({
            filters: {
              campaignIds: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.campaignIds?.length === 0;
          });
        });

        it('should filter by campaign id', async () => {
          const id = campaigns[0].id;
          const actual = await housingRepository.find({
            filters: {
              campaignIds: [id]
            }
          });

          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.campaignIds?.includes(id) ?? false;
          });
        });
      });

      describe('by owner’s age', () => {
        function createOwner(age: number | null): OwnerApi {
          return {
            ...genOwnerApi(),
            birthDate:
              age === null
                ? null
                : faker.date
                    .birthdate({
                      min: age,
                      max: age,
                      mode: 'age'
                    })
                    .toJSON()
          };
        }

        beforeAll(async () => {
          const owners: OwnerApi[] = await Promise.all(
            [
              createOwner(null),
              createOwner(39),
              createOwner(40),
              createOwner(59),
              createOwner(60),
              createOwner(74),
              createOwner(75),
              createOwner(99),
              createOwner(100)
            ].map((owner) => factories.owner.create(owner))
          );
          const housingList: HousingApi[] = await Promise.all(
            owners.map(() => factories.housing.create())
          );
          await Promise.all(
            housingList.map((housing, i) =>
              factories
                .housingOwner({ housing, owner: owners[i] })
                .create({ rank: 1 })
            )
          );
        });

        const tests: ReadonlyArray<{
          name: string;
          filter: Array<OwnerAge | null>;
          predicate(owner: OwnerApi | null): boolean;
        }> = [
          {
            name: 'unfilled birth date',
            filter: [null],
            predicate: (owner) => !owner || owner.birthDate === null
          },
          {
            name: 'less than 40 years old',
            filter: ['lt40'],
            predicate: (owner) =>
              !!owner?.birthDate &&
              differenceInYears(new Date(), new Date(owner.birthDate)) < 40
          },
          {
            name: 'between 40 and 59 years old',
            filter: ['40to59'],
            predicate: (owner) => {
              if (!owner?.birthDate) {
                return false;
              }

              const diff = differenceInYears(
                new Date(),
                new Date(owner.birthDate)
              );
              return 40 <= diff && diff <= 59;
            }
          },
          {
            name: 'between 60 and 74 years old',
            filter: ['60to74'],
            predicate: (owner) => {
              if (!owner?.birthDate) {
                return false;
              }

              const diff = differenceInYears(
                new Date(),
                new Date(owner.birthDate)
              );
              return 60 <= diff && diff <= 74;
            }
          },
          {
            name: 'between 75 and 99 years old',
            filter: ['75to99'],
            predicate: (owner) => {
              if (!owner?.birthDate) {
                return false;
              }

              const diff = differenceInYears(
                new Date(),
                new Date(owner.birthDate)
              );
              return 75 <= diff && diff <= 99;
            }
          },
          {
            name: '100 years old and more',
            filter: ['gte100'],
            predicate: (owner) => {
              if (!owner?.birthDate) {
                return false;
              }

              return (
                differenceInYears(new Date(), new Date(owner.birthDate)) >= 100
              );
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              ownerAges: filter
            },
            includes: ['owner']
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) =>
            predicate(housing.owner ?? null)
          );
        });
      });

      it('should filter by owner ids', async () => {
        const housings = await factories.housing.createList(3);
        const owners = await Promise.all(
          housings.map(() => factories.owner.create())
        );
        await Promise.all(
          housings.map((housing, i) =>
            factories
              .housingOwner({ housing, owner: owners[i] })
              .create({ rank: 1 })
          )
        );

        const actual = await housingRepository.find({
          filters: {
            ownerIds: owners.map((owner) => owner.id)
          }
        });

        expect(actual).toBeArrayOfSize(housings.length);
        expect(actual).toSatisfyAll<HousingApi>((actual) => {
          return housings.map((housing) => housing.id).includes(actual.id);
        });
      });

      describe('by owner kind', () => {
        const kinds = OWNER_KIND_VALUES;

        beforeEach(async () => {
          const housings = await factories.housing.createList(kinds.length);
          const owners: OwnerApi[] = await Promise.all(
            Object.values(OWNER_KIND_LABELS).map((kind) =>
              factories.owner.create({ kind })
            )
          );
          await Promise.all(
            housings.map((housing, i) =>
              factories
                .housingOwner({ housing, owner: owners[i] })
                .create({ rank: 1 })
            )
          );
        });

        it('should keep owners that have an empty kind', async () => {
          const housing = await factories.housing.create();
          const owner = await factories.owner.create({ kind: null });
          await factories.housingOwner({ housing, owner }).create({ rank: 1 });

          const actual = await housingRepository.find({
            filters: {
              ownerKinds: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return !housing.owner || housing.owner?.kind === null;
          });
        });

        test.each(kinds)('should filter by %s', async (kind) => {
          const actual = await housingRepository.find({
            filters: {
              ownerKinds: [kind]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.owner?.kind === OWNER_KIND_LABELS[kind];
          });
        });
      });

      describe('by relative location', () => {
        test.each(RELATIVE_LOCATION_VALUES)(
          'should include housing whose primary owner has relative location %s',
          async (relativeLocation) => {
            const housing = await factories.housing.create();
            const owner = await factories.owner.create();
            await factories
              .housingOwner({ housing, owner })
              .create({ rank: 1, relativeLocation });
            const filter = match(relativeLocation)
              .returnType<RelativeLocationFilter>()
              .with('metropolitan', 'overseas', () => 'other-region')
              .with('foreign-country', () => 'other')
              .otherwise((value) => value);

            const actual = await housingRepository.find({
              filters: {
                relativeLocations: [filter]
              }
            });

            const actualHousingOwners = await kysely
              .selectFrom('ownersHousing')
              .selectAll('ownersHousing')
              .where('rank', '=', 1)
              .where((eb) =>
                eb(
                  eb.refTuple('housingGeoCode', 'housingId'),
                  'in',
                  actual.map((housing) => eb.tuple(housing.geoCode, housing.id))
                )
              )
              .execute();
            expect(actualHousingOwners).toSatisfyAll((housingOwner) => {
              return (
                housingOwner.locpropRelativeBan !== null &&
                relativeLocationFilterToDBO(filter).includes(
                  housingOwner.locpropRelativeBan
                )
              );
            });
          }
        );
      });

      describe('by multi owners', () => {
        beforeEach(async () => {
          const housings = await factories.housing.createList(3);
          const owner = await factories.owner.create();
          const anotherOwner = await factories.owner.create();
          await Promise.all([
            ...housings
              .slice(0, 2)
              .map((housing) =>
                factories.housingOwner({ housing, owner }).create({ rank: 1 })
              ),
            ...housings
              .slice(2)
              .map((housing) =>
                factories
                  .housingOwner({ housing, owner: anotherOwner })
                  .create({ rank: 1 })
              )
          ]);
          await refreshMultiOwnerFlags([owner.id, anotherOwner.id]);
        });

        function countOwners(
          expected: Predicate.Predicate<number>
        ): (housings: ReadonlyArray<HousingApi>) => boolean {
          return flow(
            Array.map((housing: HousingApi) => housing.owner),
            Array.filter(Predicate.isNotNullable),
            Array.groupBy((owner) => owner.id),
            Record.map(Array.length),
            Record.every(expected)
          );
        }

        const tests = [
          {
            name: 'housings belonging to owners who have many properties',
            filter: [true],
            predicate: countOwners((count) => count > 1)
          },
          {
            name: 'housings belonging to owners who have only one property',
            filter: [false],
            predicate: countOwners((count) => count === 1)
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              multiOwners: filter
            },
            // Paginating would cause some owners to be missing from the result set
            pagination: {
              paginate: false
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfy<ReadonlyArray<HousingApi>>(predicate);
        });
      });

      describe('by beneficiary count', () => {
        beforeEach(async () => {
          const housings = await factories.housing.createList(
            BENEFIARY_COUNT_VALUES.length
          );
          await Promise.all(
            housings.map(async (housing, i) => {
              const owners = await factories.owner.createList(i);
              await Promise.all(
                owners.map((owner, rank) =>
                  factories
                    .housingOwner({ housing, owner })
                    .create({ rank: (rank + 1) as OwnerRank })
                )
              );
            })
          );
        });

        const tests = BENEFIARY_COUNT_VALUES.map(Number)
          .filter((count) => !Number.isNaN(count))
          .map((count) => {
            return {
              name: `housings that have ${count} active owner(s)`,
              filter: [String(count)],
              predicate(housingOwners: ReadonlyArray<{ rank: number }>) {
                return (
                  housingOwners.filter((housingOwner) => housingOwner.rank >= 1)
                    .length === count
                );
              }
            };
          })
          .concat({
            name: `housings that have 5+ secondary owners`,
            filter: ['gte5'],
            predicate(housingOwners: ReadonlyArray<{ rank: number }>) {
              return (
                housingOwners.filter((housingOwner) =>
                  isActiveOwnerRank(housingOwner.rank)
                ).length >= 5
              );
            }
          })
          .concat({
            name: 'housings that have 0 or 5+ secondary owners',
            filter: ['0', 'gte5'],
            predicate(housingOwners: ReadonlyArray<{ rank: number }>) {
              const isActive = (housingOwner: { rank: number }) =>
                isActiveOwnerRank(housingOwner.rank);
              return (
                housingOwners.filter(isActive).length === 0 ||
                housingOwners.filter(isActive).length >= 5
              );
            }
          });
        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              beneficiaryCounts: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          await async.forEach(actual, async (housing) => {
            const actualHousingOwners = await kysely
              .selectFrom('ownersHousing')
              .selectAll('ownersHousing')
              .where('housingGeoCode', '=', housing.geoCode)
              .where('housingId', '=', housing.id)
              .execute();
            expect(actualHousingOwners).toSatisfy(predicate);
          });
        });
      });

      describe('by housing kind', () => {
        beforeEach(async () => {
          await Promise.all(
            HOUSING_KIND_VALUES.map((kind) =>
              factories.housing.create({ housingKind: kind })
            )
          );
        });

        test.each(HOUSING_KIND_VALUES)('should filter by %s', async (kind) => {
          const actual = await housingRepository.find({
            filters: {
              housingKinds: [kind]
            }
          });

          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.housingKind === kind;
          });
        });
      });

      describe('by living area', () => {
        beforeEach(async () => {
          await Promise.all(
            [34, 35, 74, 75, 99, 100].map((livingArea) =>
              factories.housing.create({ livingArea })
            )
          );
        });

        const tests = [
          {
            name: 'less than 35 m2',
            filter: ['lt35'],
            predicate: (housing: HousingApi) =>
              housing.livingArea !== null && housing.livingArea < 35
          },
          {
            name: 'between 35 and 74 m2',
            filter: ['35to74'],
            predicate: (housing: HousingApi) =>
              housing.livingArea !== null &&
              35 <= housing.livingArea &&
              housing.livingArea <= 74
          },
          {
            name: 'between 75 and 99 m2',
            filter: ['75to99'],
            predicate: (housing: HousingApi) =>
              housing.livingArea !== null &&
              75 <= housing.livingArea &&
              housing.livingArea <= 99
          },
          {
            name: 'more than 100 m2',
            filter: ['gte100'],
            predicate: (housing: HousingApi) =>
              housing.livingArea !== null && housing.livingArea >= 100
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              housingAreas: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by room count', () => {
        beforeEach(async () => {
          await Promise.all(
            fp
              .range(0, 10)
              .map((i) => factories.housing.create({ roomsCount: i + 1 }))
          );
        });

        const tests = ROOM_COUNT_VALUES.map(Number)
          .filter((count) => !Number.isNaN(count))
          .map((count) => {
            return {
              name: `housings with ${count} room(s)`,
              filter: [String(count)],
              predicate(housing: HousingApi) {
                return housing.roomsCount === count;
              }
            };
          })
          .concat({
            name: 'housings with 5+ rooms',
            filter: ['gte5'],
            predicate(housing: HousingApi) {
              return housing.roomsCount !== null && housing.roomsCount >= 5;
            }
          });

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              roomsCounts: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by cadastral classification', () => {
        const cadastralClassifications = [
          null,
          ...CADASTRAL_CLASSIFICATION_VALUES
        ];

        beforeAll(async () => {
          await Promise.all(
            cadastralClassifications.map((cadastralClassification) =>
              factories.housing.create({ cadastralClassification })
            )
          );
        });

        test.each(cadastralClassifications)(
          'should filter by cadastral classification = %s',
          async (cadastralClassification) => {
            const actual = await housingRepository.find({
              filters: {
                cadastralClassifications: [cadastralClassification]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>((housing) => {
              return (
                housing.cadastralClassification === cadastralClassification
              );
            });
          }
        );
      });

      describe('by building period', () => {
        beforeEach(async () => {
          await Promise.all(
            [1918, 1919, 1945, 1946, 1990, 1991].map((buildingYear) =>
              factories.housing.create({ buildingYear })
            )
          );
        });

        const tests = [
          {
            name: 'housings built before 1919',
            filter: ['lt1919'],
            predicate(housing: HousingApi) {
              return !!housing.buildingYear && housing.buildingYear < 1919;
            }
          },
          {
            name: 'housings built between 1919 and 1945',
            filter: ['1919to1945'],
            predicate(housing: HousingApi) {
              return (
                !!housing.buildingYear &&
                1919 <= housing.buildingYear &&
                housing.buildingYear <= 1945
              );
            }
          },
          {
            name: 'housings built between 1946 and 1990',
            filter: ['1946to1990'],
            predicate(housing: HousingApi) {
              return (
                !!housing.buildingYear &&
                1946 <= housing.buildingYear &&
                housing.buildingYear <= 1990
              );
            }
          },
          {
            name: 'housings built after 1990',
            filter: ['gte1991'],
            predicate(housing: HousingApi) {
              return !!housing.buildingYear && housing.buildingYear >= 1991;
            }
          },
          {
            name: 'housings built before 1919 or after 1990',
            filter: ['lt1919', 'gte1991'],
            predicate(housing: HousingApi) {
              return (
                !!housing.buildingYear &&
                (housing.buildingYear < 1919 || housing.buildingYear >= 1991)
              );
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              buildingPeriods: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by vacancy duration', () => {
        beforeEach(async () => {
          await Promise.all([
            ...fp.range(0, 16).map((i) =>
              factories.housing.create({
                vacancyStartYear: ReferenceDataYear - i
              })
            ),
            factories.housing.create({ vacancyStartYear: null })
          ]);
        });

        const tests: ReadonlyArray<{
          name: string;
          filter: VacancyYear[];
          predicate: (housing: HousingApi) => boolean;
        }> = [
          {
            name: '2021',
            filter: ['2021'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2021
          },
          {
            name: '2020',
            filter: ['2020'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2020
          },
          {
            name: '2019',
            filter: ['2019'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2019
          },
          {
            name: 'Entre 2018 et 2015',
            filter: ['2018to2015'],
            predicate: (housing: HousingApi) => {
              const vacancyStartYear = housing.vacancyStartYear as number;
              return vacancyStartYear >= 2015 && vacancyStartYear <= 2018;
            }
          },
          {
            name: 'Entre 2014 et 2010',
            filter: ['2014to2010'],
            predicate: (housing: HousingApi) => {
              const vacancyStartYear = housing.vacancyStartYear as number;
              return vacancyStartYear >= 2010 && vacancyStartYear < 2015;
            }
          },
          {
            name: 'Avant 2010',
            filter: ['before2010'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) < 2010
          },
          {
            name: 'Pas d’information',
            filter: ['missingData'],
            predicate: (housing: HousingApi) =>
              housing.vacancyStartYear === null
          },
          {
            name: '2023',
            filter: ['2023'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2023
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              vacancyYears: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by taxed', () => {
        beforeEach(async () => {
          await Promise.all(
            [true, false, null].map((taxed) =>
              factories.housing.create({ taxed })
            )
          );
        });

        const tests = [
          {
            name: 'housings that get taxed',
            filter: [true],
            predicate: (housing: HousingApi) => !!housing.taxed
          },
          {
            name: 'housings that do not get taxed',
            filter: [false],
            predicate: (housing: HousingApi) => !housing.taxed
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              isTaxedValues: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by ownership kind', () => {
        beforeEach(async () => {
          const ownershipKinds: ReadonlyArray<string | null> = [
            // Monopropriété
            'single',
            null,
            // Copropriété
            'CL',
            'co',
            'CLV',
            'CV',
            // Autre
            'BND',
            'MP',
            'TF'
          ];
          await Promise.all(
            ownershipKinds.map((ownershipKind) =>
              factories.housing.create({ ownershipKind })
            )
          );
        });

        const tests: ReadonlyArray<{
          name: string;
          filter: OwnershipKind[];
          predicate: Predicate.Predicate<HousingApi>;
        }> = [
          {
            name: 'housings that are single-owned',
            filter: ['single'],
            predicate: (housing: HousingApi) =>
              !housing.ownershipKind || housing.ownershipKind === 'single'
          },
          {
            name: 'housings that are co-owned',
            filter: ['co'],
            predicate: (housing: HousingApi) => {
              return (
                !!housing.ownershipKind &&
                (
                  INTERNAL_CO_CONDOMINIUM_VALUES as ReadonlyArray<string>
                ).includes(housing.ownershipKind)
              );
            }
          },
          {
            name: 'other housings',
            filter: ['other'],
            predicate: (housing: HousingApi) => {
              const values = [
                ...INTERNAL_MONO_CONDOMINIUM_VALUES,
                ...INTERNAL_CO_CONDOMINIUM_VALUES
              ] as ReadonlyArray<string>;
              return (
                !!housing.ownershipKind &&
                !values.includes(housing.ownershipKind)
              );
            }
          },
          {
            name: 'single-owned and co-owned housings',
            filter: ['single', 'co'],
            predicate: (housing: HousingApi) => {
              const values = [
                ...INTERNAL_MONO_CONDOMINIUM_VALUES,
                ...INTERNAL_CO_CONDOMINIUM_VALUES
              ] as ReadonlyArray<string>;
              return (
                !housing.ownershipKind || values.includes(housing.ownershipKind)
              );
            }
          },
          {
            name: 'single-owned and other housings',
            filter: ['single', 'other'],
            predicate: (housing: HousingApi) => {
              const values =
                INTERNAL_CO_CONDOMINIUM_VALUES as ReadonlyArray<string>;
              return (
                !housing.ownershipKind ||
                !values.includes(housing.ownershipKind)
              );
            }
          },
          {
            name: 'co-owned and other housings',
            filter: ['co', 'other'],
            predicate: (housing: HousingApi) => {
              const values =
                INTERNAL_MONO_CONDOMINIUM_VALUES as ReadonlyArray<string>;
              return (
                !!housing.ownershipKind &&
                !values.includes(housing.ownershipKind)
              );
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              ownershipKinds: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by housing count by building', () => {
        async function createHousingByBuilding(
          building: BuildingApi
        ): Promise<HousingApi[]> {
          return Promise.all(
            faker.helpers.multiple(
              () => factories.housing.create({ buildingId: building.id }),
              { count: building.housingCount }
            )
          );
        }

        beforeEach(async () => {
          const testAmounts = [4, 5, 19, 20, 49, 50];

          const buildings: BuildingApi[] = await Promise.all(
            testAmounts.map((amount) =>
              factories.building.create({ housingCount: amount })
            )
          );

          const housingByBuilding: HousingApi[][] = await Promise.all(
            buildings.map((building) => createHousingByBuilding(building))
          );
          const housingList = housingByBuilding.flat();
          const owner = await factories.owner.create();
          await Promise.all(
            housingList.map((housing) =>
              factories.housingOwner({ housing, owner }).create({ rank: 1 })
            )
          );
        });

        const tests = [
          {
            name: 'less than 5',
            filter: ['lt5'],
            predicate: (building: { housingCount: number }) => {
              return building.housingCount < 5;
            }
          },
          {
            name: 'between 5 and 19',
            filter: ['5to19'],
            predicate: (building: { housingCount: number }) => {
              return 5 <= building.housingCount && building.housingCount <= 19;
            }
          },
          {
            name: 'between 20 and 49',
            filter: ['20to49'],
            predicate: (building: { housingCount: number }) => {
              return 20 <= building.housingCount && building.housingCount <= 49;
            }
          },
          {
            name: '50 and more',
            filter: ['gte50'],
            predicate: (building: { housingCount: number }) => {
              return building.housingCount >= 50;
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              housingCounts: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          const ids = fp.uniq(
            actual.map((housing) => housing.buildingId).filter(isDefined)
          );
          const buildings = await kysely
            .selectFrom('buildings')
            .selectAll('buildings')
            .where('id', 'in', ids)
            .execute();
          expect(buildings).toSatisfyAll(predicate);
        });

        it('should not crash when combined with the buildings include (both join buildings)', async () => {
          const actual = await housingRepository.find({
            filters: {
              housingCounts: ['5to19']
            },
            includes: ['buildings']
          });

          expect(actual.length).toBeGreaterThan(0);
        });
      });

      describe('by vacancy rate by building', () => {
        function createHousingByBuilding(building: BuildingApi): HousingApi[] {
          return faker.helpers
            .multiple(
              () => ({
                ...genHousingApi(building.id.substring(0, 5)),
                occupancy: Occupancy.VACANT,
                buildingId: building.id
              }),
              { count: building.vacantHousingCount }
            )
            .concat(
              faker.helpers.multiple(
                () => ({
                  ...genHousingApi(),
                  buildingId: building.id,
                  occupancy: Occupancy.UNKNOWN
                }),
                { count: building.housingCount - building.vacantHousingCount }
              )
            );
        }

        beforeEach(async () => {
          const testAmounts = [
            { vacant: 19, total: 100 },
            { vacant: 2, total: 10 },
            { vacant: 39, total: 100 },
            { vacant: 4, total: 10 },
            { vacant: 59, total: 100 },
            { vacant: 6, total: 10 },
            { vacant: 79, total: 100 },
            { vacant: 8, total: 10 }
          ];

          const buildings: BuildingApi[] = await Promise.all(
            testAmounts.map(({ vacant, total }) =>
              factories.building.create({
                vacantHousingCount: vacant,
                housingCount: total
              })
            )
          );

          const housingByBuilding: HousingApi[][] = buildings.map((building) =>
            createHousingByBuilding(building)
          );
          const housingList = housingByBuilding.flat();
          // 440 rows: bulk-insert directly instead of factories.housing.create,
          // which would be far too slow for this volume.
          for (const chunk of fp.chunk(500, housingList)) {
            await kysely
              .insertInto('fastHousing')
              .values(chunk.map(toHousingInsert))
              .execute();
          }
        });

        type BuildingCounts = {
          vacantHousingCount: number;
          housingCount: number;
        };

        const tests = [
          {
            name: 'less than 20 %',
            filter: ['lt20'],
            predicate: (building: BuildingCounts) => {
              return building.vacantHousingCount / building.housingCount < 0.2;
            }
          },
          {
            name: 'between 20 and 39 %',
            filter: ['20to39'],
            predicate: (building: BuildingCounts) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.2 <= rate && rate <= 0.39;
            }
          },
          {
            name: 'between 40 and 59 %',
            filter: ['40to59'],
            predicate: (building: BuildingCounts) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.4 <= rate && rate <= 0.59;
            }
          },
          {
            name: 'between 60 and 79 %',
            filter: ['60to79'],
            predicate: (building: BuildingCounts) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.6 <= rate && rate <= 0.79;
            }
          },
          {
            name: '80 % and more',
            filter: ['gte80'],
            predicate: (building: BuildingCounts) => {
              return building.vacantHousingCount / building.housingCount >= 0.8;
            }
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              vacancyRates: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          const ids = fp.uniq(
            actual.map((housing) => housing.buildingId).filter(isDefined)
          );
          const buildings = await kysely
            .selectFrom('buildings')
            .selectAll('buildings')
            .where('id', 'in', ids)
            .execute();
          expect(buildings).toSatisfyAll(predicate);
        });
      });

      describe('by locality', () => {
        const geoCodes = ['12345', '23456', '34567'];

        beforeEach(async () => {
          await Promise.all(
            geoCodes.map((geoCode) => factories.housing.create({ geoCode }))
          );
        });

        test.each(geoCodes)(
          `should keep housings that have the geo code %s`,
          async (geoCode) => {
            const actual = await housingRepository.find({
              filters: {
                localities: [geoCode]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>(
              (housing) => housing.geoCode === geoCode
            );
          }
        );
      });

      describe('by locality kind', () => {
        it('should filter by empty locality kind', async () => {
          const locality: LocalityApi = {
            ...genLocalityApi(),
            kind: null
          };
          await kysely
            .insertInto('localities')
            .values(toLocalityInsert(locality))
            .execute();
          await factories.housing.create({ geoCode: locality.geoCode });

          const actual = await housingRepository.find({
            filters: {
              localityKinds: [null]
            }
          });

          const actualLocalities = await kysely
            .selectFrom('localities')
            .selectAll('localities')
            .where('localityKind', 'is', null)
            .execute();
          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return actualLocalities.some(
              (locality) => locality.geoCode === housing.geoCode
            );
          });
        });

        it('should filter by locality kind', async () => {
          const localities: LocalityApi[] = [
            { ...genLocalityApi(), kind: 'ACV' },
            { ...genLocalityApi(), kind: 'PVD' }
          ];
          await kysely
            .insertInto('localities')
            .values(localities.map(toLocalityInsert))
            .execute();
          await Promise.all(
            faker.helpers.multiple(
              () =>
                factories.housing.create({
                  geoCode: oneOf(localities).geoCode
                }),
              { count: 10 }
            )
          );

          const actual = await housingRepository.find({
            filters: {
              localityKinds: ['ACV', 'PVD']
            }
          });

          const actualLocalities = await kysely
            .selectFrom('localities')
            .selectAll('localities')
            .where('localityKind', 'in', ['ACV', 'PVD'])
            .execute();
          expect(actual).toSatisfyAll<HousingApi>((housing) =>
            actualLocalities
              .map((locality) => locality.geoCode)
              .includes(housing.geoCode)
          );
        });
      });

      describe('by included perimeter', () => {
        it('should keep housings within the perimeter', async () => {
          const box = turf.multiPolygon([
            [
              [
                [2, 48],
                [2, 49],
                [3, 49],
                [3, 48],
                [2, 48]
              ]
            ]
          ]);
          const perimeter: GeoPerimeterApi = {
            ...genGeoPerimeterApi(establishment.id, user),
            geometry: box.geometry
          };
          await kysely
            .insertInto('geoPerimeters')
            .values(toGeoPerimeterInsert(perimeter))
            .execute();
          await Promise.all([
            factories.housing.create({ longitude: 2.5, latitude: 48.5 }),
            factories.housing.create({ longitude: 2, latitude: 47.9 }),
            factories.housing.create({ longitude: 1.9, latitude: 48 })
          ]);

          const actual = await housingRepository.find({
            filters: {
              geoPerimetersIncluded: [perimeter.kind]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            if (housing.longitude === null || housing.latitude === null) {
              return false;
            }

            const point = turf.point([housing.longitude, housing.latitude]);
            return turf.booleanPointInPolygon(point, box);
          });
        });
      });

      describe('by excluded perimeter', () => {
        it('should keep housings outside the perimeter', async () => {
          const box = turf.multiPolygon([
            [
              [
                [2, 48],
                [2, 49],
                [3, 49],
                [3, 48],
                [2, 48]
              ]
            ]
          ]);
          const perimeter: GeoPerimeterApi = {
            ...genGeoPerimeterApi(establishment.id, user),
            geometry: box.geometry
          };
          await kysely
            .insertInto('geoPerimeters')
            .values(toGeoPerimeterInsert(perimeter))
            .execute();
          await Promise.all([
            factories.housing.create({ longitude: 2.5, latitude: 48.5 }),
            factories.housing.create({ longitude: 2, latitude: 47.9 }),
            factories.housing.create({ longitude: 1.9, latitude: 48 })
          ]);

          const actual = await housingRepository.find({
            filters: {
              geoPerimetersExcluded: [perimeter.kind]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            if (!housing.longitude || !housing.latitude) {
              return true;
            }

            const point = turf.point([housing.longitude, housing.latitude]);
            return !turf.booleanPointInPolygon(point, box);
          });
        });
      });

      describe('by included data file year', () => {
        beforeEach(async () => {
          await factories.housing.createList(10);
        });

        it('should keep housings that have no data file years', async () => {
          await factories.housing.create({ dataFileYears: [] });

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsIncluded: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return (
              housing.dataFileYears === undefined ||
              housing.dataFileYears.length === 0
            );
          });
        });

        it('should keep housings that belong to the given data file year', async () => {
          const dataFileYears: HousingFiltersApi['dataFileYearsIncluded'] = [
            'lovac-2023',
            'lovac-2024'
          ];

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsIncluded: dataFileYears
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            const set = new Set(dataFileYears);
            return housing.dataFileYears.some((dataFileYear) =>
              set.has(dataFileYear as DataFileYear)
            );
          });
        });

        it('should keep housings with source datafoncier-manual when datafoncier-manual is included', async () => {
          await Promise.all([
            factories.housing.create({
              source: 'datafoncier-manual',
              dataFileYears: ['ff-2024']
            }),
            factories.housing.create({
              source: 'lovac',
              dataFileYears: ['lovac-2024']
            })
          ]);

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsIncluded: ['datafoncier-manual']
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.source === 'datafoncier-manual';
          });
        });
      });

      describe('by excluded data file year', () => {
        beforeEach(() => factories.housing.createList(10));

        it('should skip housings that have no data file years', async () => {
          await factories.housing.create({ dataFileYears: [] });

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsExcluded: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.dataFileYears.length > 0;
          });
        });

        it('should keep housings that do not belong to the given data file year', async () => {
          const dataFileYears: HousingFiltersApi['dataFileYearsExcluded'] = [
            'lovac-2023',
            'lovac-2024'
          ];

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsExcluded: dataFileYears
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            const set = new Set(dataFileYears);
            return !housing.dataFileYears.some((dataFileYear) =>
              set.has(dataFileYear as DataFileYear)
            );
          });
        });

        it('should exclude housings with source datafoncier-manual when datafoncier-manual is excluded', async () => {
          await Promise.all([
            factories.housing.create({
              source: 'datafoncier-manual',
              dataFileYears: ['ff-2024']
            }),
            factories.housing.create({
              source: 'lovac',
              dataFileYears: ['lovac-2024']
            })
          ]);

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsExcluded: ['datafoncier-manual']
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.source !== 'datafoncier-manual';
          });
        });

        // The two special exclusions (null and datafoncier-manual) combine with
        // AND, matching the pre-Kysely Knex behaviour: a housing is kept only if
        // it has data file years AND is not datafoncier-manual. A
        // datafoncier-manual housing with non-empty data file years must still be
        // excluded — it must not slip through via the "has data file years" arm.
        it('should combine null and datafoncier-manual exclusions with AND', async () => {
          const manualWithYears = await factories.housing.create({
            source: 'datafoncier-manual',
            dataFileYears: ['ff-2024']
          });
          const lovacWithYears = await factories.housing.create({
            source: 'lovac',
            dataFileYears: ['lovac-2024']
          });
          const lovacWithoutYears = await factories.housing.create({
            source: 'lovac',
            dataFileYears: []
          });

          const actual = await housingRepository.find({
            filters: {
              dataFileYearsExcluded: [null, 'datafoncier-manual']
            },
            // Disable pagination: with the default 50-row page, the fixtures can
            // fall outside page 1 once other tests have seeded the table, making
            // the presence/absence assertions below unreliable.
            pagination: { paginate: false }
          });

          const ids = actual.map((housing) => housing.id);
          expect(ids).not.toContain(manualWithYears.id);
          expect(ids).not.toContain(lovacWithoutYears.id);
          expect(ids).toContain(lovacWithYears.id);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return (
              housing.dataFileYears.length > 0 &&
              housing.source !== 'datafoncier-manual'
            );
          });
        });
      });

      describe('by status', () => {
        beforeEach(async () => {
          await Promise.all(
            HOUSING_STATUS_VALUES.map((status) =>
              factories.housing.create({ status })
            )
          );
        });

        test.each(HOUSING_STATUS_VALUES)(
          'should keep housings with status %s',
          async (status) => {
            const actual = await housingRepository.find({
              filters: {
                statusList: [status]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>(
              (housing) => housing.status === status
            );
          }
        );
      });

      describe('by substatus', () => {
        const substatus = 'Intervention publique';

        beforeEach(async () => {
          await Promise.all([
            factories.housing.create({ subStatus: substatus }),
            factories.housing.create({ subStatus: 'Autre' })
          ]);
        });

        it(`should keep housings with substatus "${substatus}"`, async () => {
          const actual = await housingRepository.find({
            filters: {
              subStatus: [substatus]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(
            (housing) => housing.subStatus === substatus
          );
        });
      });

      it('should query by an owner’s name', async () => {
        const housingList = await factories.housing.createList(10);
        const owner = await factories.owner.create({
          fullName: 'Jean Dupont'
        });
        await Promise.all(
          housingList.map((housing) =>
            factories.housingOwner({ housing, owner }).create({ rank: 1 })
          )
        );
        const query = 'Dupon';

        const actual = await housingRepository.find({
          filters: {
            query
          }
        });

        expect(actual).toSatisfyAll<HousingApi>(
          (housing) => housing.owner?.fullName?.includes(query) ?? false
        );
      });

      describe('Mutation', () => {
        describe('by last mutation year', () => {
          beforeAll(async () => {
            function createHousingWithMutation(
              year: number
            ): Promise<HousingApi> {
              const date = faker.date.between({
                from: year.toString(),
                to: endOfYear(year.toString())
              });
              const bool = faker.datatype.boolean();
              return factories.housing.create({
                lastTransactionDate: bool ? date.toJSON() : null,
                lastMutationDate: bool ? null : date.toJSON()
              });
            }

            const years: number[] = [];
            for (let i = 2000; i <= 2024; i++) {
              years.push(i);
            }
            await Promise.all([
              ...years.map((year) => createHousingWithMutation(year)),
              factories.housing.create({
                lastMutationDate: null,
                lastTransactionDate: null,
                lastTransactionValue: null
              })
            ]);
          });

          const tests: ReadonlyArray<{
            name: string;
            filter: Array<LastMutationYearFilter | null>;
            predicate: Predicate.Predicate<HousingApi>;
          }> = [
            {
              name: 'housings that were mutated in 2024',
              filter: ['2024'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation?.date?.getUTCFullYear() === 2024;
              }
            },
            {
              name: 'housings that were mutated in 2023',
              filter: ['2023'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation?.date?.getUTCFullYear() === 2023;
              }
            },
            {
              name: 'housings that were mutated in 2022',
              filter: ['2022'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation?.date?.getUTCFullYear() === 2022;
              }
            },
            {
              name: 'housings that were mutated in 2021',
              filter: ['2021'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation?.date?.getUTCFullYear() === 2021;
              }
            },
            {
              name: 'housings that were mutated between 2015 and 2020',
              filter: ['2015to2020'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                const year = mutation?.date?.getUTCFullYear();
                return year !== undefined && 2015 <= year && year <= 2020;
              }
            },
            {
              name: 'housings that were mutated between 2010 and 2014',
              filter: ['2010to2014'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                const year = mutation?.date?.getUTCFullYear();
                return year !== undefined && 2010 <= year && year <= 2014;
              }
            },
            {
              name: 'housings that were mutated before 2010',
              filter: ['lte2009'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation?.date
                  ? mutation.date.getUTCFullYear() <= 2009
                  : false;
              }
            },
            {
              name: 'housings that have no mutation date',
              filter: [null],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation === null;
              }
            }
          ];

          test.each(tests)(
            'should keep $name',
            async ({ filter, predicate }) => {
              const actual = await housingRepository.find({
                filters: {
                  lastMutationYears: filter
                }
              });

              expect(actual.length).toBeGreaterThan(0);
              expect(actual).toSatisfyAll<HousingApi>(predicate);
            }
          );
        });

        describe('by last mutation type', () => {
          beforeAll(async () => {
            async function createHousings(
              types: ReadonlyArray<HousingApi['lastMutationType']>
            ): Promise<void> {
              await Promise.all(
                types.map((type) =>
                  match(type)
                    .with('donation', () =>
                      factories.housing.create({
                        lastMutationType: type,
                        lastMutationDate: '2024-01-01',
                        lastTransactionDate: '2020-01-01',
                        lastTransactionValue: null
                      })
                    )
                    .with('sale', () =>
                      factories.housing.create({
                        lastMutationType: type,
                        lastMutationDate: '2023-01-01',
                        lastTransactionDate: '2024-01-01',
                        lastTransactionValue: 1_000_000
                      })
                    )
                    .with(null, () =>
                      factories.housing.create({
                        lastMutationType: type,
                        lastMutationDate: null,
                        lastTransactionDate: null,
                        lastTransactionValue: null
                      })
                    )
                    .exhaustive()
                )
              );
            }

            await createHousings(['sale', 'donation', null]);
          });

          const tests: ReadonlyArray<{
            name: string;
            filter: Array<LastMutationTypeFilter | null>;
            predicate: Predicate.Predicate<HousingApi>;
          }> = [
            {
              name: 'housings that were sold',
              filter: ['sale'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation?.type === 'sale';
              }
            },
            {
              name: 'housings that were donated',
              filter: ['donation'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation?.type === 'donation';
              }
            },
            {
              name: 'housings that were sold or donated',
              filter: ['sale', 'donation'],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return (
                  mutation?.type === 'donation' || mutation?.type === 'sale'
                );
              }
            },
            {
              name: 'other housings',
              filter: [null],
              predicate: (housing: HousingApi) => {
                const mutation = fromHousing({
                  lastMutationType: housing.lastMutationType,
                  lastMutationDate: housing.lastMutationDate,
                  lastTransactionDate: housing.lastTransactionDate,
                  lastTransactionValue: housing.lastTransactionValue
                });
                return mutation?.type === null || mutation === null;
              }
            }
          ];

          test.each(tests)(
            'should keep $name',
            async ({ filter, predicate }) => {
              const actual = await housingRepository.find({
                filters: {
                  lastMutationTypes: filter
                }
              });

              expect(actual.length).toBeGreaterThan(0);
              expect(actual).toSatisfyAll<HousingApi>(predicate);
            }
          );
        });

        describe('by last mutation type and year', () => {
          async function createHousings(
            payloads: ReadonlyArray<
              Pick<
                HousingApi,
                | 'lastMutationType'
                | 'lastMutationDate'
                | 'lastTransactionDate'
                | 'lastTransactionValue'
              >
            >
          ): Promise<ReadonlyArray<HousingApi>> {
            return Promise.all(
              payloads.map((payload) => factories.housing.create(payload))
            );
          }

          it('should keep housings that were donated in 2024', async () => {
            await createHousings([
              {
                lastMutationType: 'donation',
                lastMutationDate: '2024-01-01',
                lastTransactionDate: '2020-01-01',
                lastTransactionValue: null
              },
              {
                lastMutationType: 'donation',
                lastMutationDate: '2024-12-31',
                lastTransactionDate: null,
                lastTransactionValue: null
              },
              // Should be excluded because it was sold in 2024
              {
                lastMutationType: 'sale',
                lastMutationDate: '2023-01-01',
                lastTransactionDate: '2024-01-01',
                lastTransactionValue: 1_000_000
              },
              // Should be excluded because it was donated in 2025
              {
                lastMutationType: 'donation',
                lastMutationDate: '2025-01-01',
                lastTransactionDate: '2024-01-01',
                lastTransactionValue: null
              }
            ]);

            const actual = await housingRepository.find({
              filters: {
                lastMutationTypes: ['donation'],
                lastMutationYears: ['2024']
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>((housing) => {
              const mutation = fromHousing({
                lastMutationType: housing.lastMutationType,
                lastMutationDate: housing.lastMutationDate,
                lastTransactionDate: housing.lastTransactionDate,
                lastTransactionValue: housing.lastTransactionValue
              });
              return (
                mutation?.type === 'donation' &&
                mutation.date.getUTCFullYear() === 2024
              );
            });
          });

          it('should keep housings that were sold in 2024', async () => {
            await createHousings([
              {
                lastMutationType: 'sale',
                lastMutationDate: '2023-01-01',
                lastTransactionDate: '2024-01-01',
                lastTransactionValue: faker.number.int({
                  min: 100_000,
                  max: 1_000_000
                })
              },
              {
                lastMutationType: 'sale',
                lastMutationDate: null,
                lastTransactionDate: '2024-01-01',
                lastTransactionValue: faker.number.int({
                  min: 100_000,
                  max: 1_000_000
                })
              },
              {
                lastMutationType: 'donation',
                lastMutationDate: '2024-01-01',
                lastTransactionDate: null,
                lastTransactionValue: null
              }
            ]);

            const actual = await housingRepository.find({
              filters: {
                lastMutationTypes: ['sale'],
                lastMutationYears: ['2024']
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>((housing) => {
              const mutation = fromHousing({
                lastMutationType: housing.lastMutationType,
                lastMutationDate: housing.lastMutationDate,
                lastTransactionDate: housing.lastTransactionDate,
                lastTransactionValue: housing.lastTransactionValue
              });
              return (
                mutation?.type === 'sale' &&
                mutation.date.getUTCFullYear() === 2024
              );
            });
          });

          it('should keep housings of which we have no type information', async () => {
            await createHousings([
              {
                lastMutationType: null,
                lastMutationDate: '2024-01-01',
                lastTransactionDate: null,
                lastTransactionValue: null
              }
            ]);

            const actual = await housingRepository.find({
              filters: {
                lastMutationTypes: [null],
                lastMutationYears: ['2024']
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>((housing) => {
              const mutation = fromHousing({
                lastMutationType: housing.lastMutationType,
                lastMutationDate: housing.lastMutationDate,
                lastTransactionDate: housing.lastTransactionDate,
                lastTransactionValue: housing.lastTransactionValue
              });
              return (
                mutation === null ||
                (mutation?.type === null &&
                  mutation.date.getUTCFullYear() === 2024)
              );
            });
          });

          it('should keep housings of which we have no information at all', async () => {
            await createHousings([
              {
                lastMutationType: null,
                lastMutationDate: null,
                lastTransactionDate: null,
                lastTransactionValue: null
              }
            ]);

            const actual = await housingRepository.find({
              filters: {
                lastMutationTypes: [null],
                lastMutationYears: [null]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>((housing) => {
              const mutation = fromHousing({
                lastMutationType: housing.lastMutationType,
                lastMutationDate: housing.lastMutationDate,
                lastTransactionDate: housing.lastTransactionDate,
                lastTransactionValue: housing.lastTransactionValue
              });
              return mutation === null || mutation.type === null;
            });
          });
        });
      });
    });
  });

  describe('count', () => {
    it('should return zero counts when localities is an empty array', async () => {
      const result = await housingRepository.count({ localities: [] });

      expect(result).toEqual({ housing: 0, owners: 0 });
    });

    describe('Filters', () => {
      describe('by owner ids', () => {
        const geoCode = oneOf(establishment.geoCodes);
        let targetOwner: OwnerApi;

        beforeEach(async () => {
          const housing1 = await factories.housing.create({ geoCode });
          const housing2 = await factories.housing.create({ geoCode });
          targetOwner = await factories.owner.create();
          const otherOwner = await factories.owner.create();
          await Promise.all([
            factories
              .housingOwner({ housing: housing1, owner: targetOwner })
              .create({ rank: 1 }),
            factories
              .housingOwner({ housing: housing2, owner: otherOwner })
              .create({ rank: 1 })
          ]);
        });

        it('should count only housings belonging to the given owner', async () => {
          const result = await housingRepository.count({
            establishmentIds: [establishment.id],
            ownerIds: [targetOwner.id]
          });

          expect(result.housing).toBe(1);
          expect(result.owners).toBe(1);
        });
      });

      describe('by multi owners', () => {
        const geoCode = oneOf(establishment.geoCodes);

        beforeEach(async () => {
          const multiHousing1 = await factories.housing.create({ geoCode });
          const multiHousing2 = await factories.housing.create({ geoCode });
          const singleHousing = await factories.housing.create({ geoCode });
          const multiOwner = await factories.owner.create();
          const singleOwner = await factories.owner.create();
          await Promise.all([
            factories
              .housingOwner({ housing: multiHousing1, owner: multiOwner })
              .create({ rank: 1 }),
            factories
              .housingOwner({ housing: multiHousing2, owner: multiOwner })
              .create({ rank: 1 }),
            factories
              .housingOwner({ housing: singleHousing, owner: singleOwner })
              .create({ rank: 1 })
          ]);
          await refreshMultiOwnerFlags([multiOwner.id, singleOwner.id]);
        });

        it('should count only housings belonging to owners who have multiple properties', async () => {
          const result = await housingRepository.count({
            establishmentIds: [establishment.id],
            multiOwners: [true],
            localities: [geoCode]
          });

          expect(result.housing).toBe(2);
          expect(result.owners).toBe(1);
        });
      });

      describe('by beneficiary count', () => {
        const geoCode = oneOf(establishment.geoCodes);
        let housingIds: string[];

        beforeEach(async () => {
          const housingWith2 = await factories.housing.create({ geoCode });
          const housingWith1 = await factories.housing.create({ geoCode });
          housingIds = [housingWith2.id, housingWith1.id];
          const owners = await factories.owner.createList(3);
          await Promise.all([
            ...owners
              .slice(0, 2)
              .map((owner, rank) =>
                factories
                  .housingOwner({ housing: housingWith2, owner })
                  .create({ rank: (rank + 1) as OwnerRank })
              ),
            factories
              .housingOwner({ housing: housingWith1, owner: owners[2] })
              .create({ rank: 1 })
          ]);
        });

        it('should count only housings with the given number of beneficiaries', async () => {
          const result = await housingRepository.count({
            establishmentIds: [establishment.id],
            beneficiaryCounts: ['2'],
            housingIds,
            localities: [geoCode]
          });

          expect(result.housing).toBe(1);
        });
      });
    });
  });

  describe('findOne', () => {
    const housing: HousingApi = genHousingApi(oneOf(establishment.geoCodes));
    const owner: OwnerApi = genOwnerApi();
    const address: AddressApi = genAddressApi(owner.id, AddressKinds.Owner);

    beforeAll(async () => {
      await factories.housing.create(housing);
      await factories.owner.create(owner);
      await factories.housingOwner({ housing, owner }).create({ rank: 1 });
      await kysely
        .insertInto('banAddresses')
        .values(toAddressInsert(address))
        .execute();
    });

    it('should find by id', async () => {
      const actual = await housingRepository.findOne({
        geoCode: [housing.geoCode],
        id: housing.id
      });

      expect(actual).toHaveProperty('id', housing.id);
    });

    it('should find by local id', async () => {
      const actual = await housingRepository.findOne({
        geoCode: [housing.geoCode],
        localId: housing.localId
      });

      expect(actual).toHaveProperty('id', housing.id);
    });

    it('should not include owner by default', async () => {
      const actual = await housingRepository.findOne({
        geoCode: [housing.geoCode],
        id: housing.id
      });

      expect(actual).toHaveProperty('owner', null);
    });

    it('should include owner on demand', async () => {
      const actual = await housingRepository.findOne({
        geoCode: [housing.geoCode],
        id: housing.id,
        includes: ['owner']
      });

      expect(actual).toHaveProperty('owner');
      expect(actual?.owner).toHaveProperty('id', owner.id);
    });

    it('should include the BAN address', async () => {
      const actual = await housingRepository.findOne({
        geoCode: [housing.geoCode],
        id: housing.id,
        includes: ['owner']
      });

      expect(actual?.owner?.banAddress).toStrictEqual<AddressApi>({
        refId: owner.id,
        addressKind: AddressKinds.Owner,
        banId: address.banId,
        label: address.label,
        houseNumber: address.houseNumber,
        street: address.street,
        postalCode: address.postalCode,
        city: address.city,
        cityCode: address.cityCode,
        latitude: address.latitude,
        longitude: address.longitude,
        score: address.score,
        lastUpdatedAt: expect.any(String)
      });
    });
  });

  describe('stream', () => {
    beforeAll(async () => {
      await Promise.all(
        faker.helpers.multiple(
          () =>
            factories.housing.create({
              geoCode: oneOf(establishment.geoCodes)
            }),
          { count: 5 }
        )
      );
    });

    it('should stream a list of housing', async () => {
      const stream = housingRepository.stream({
        filters: {
          localities: establishment.geoCodes
        },
        includes: ['owner']
      });

      const actual: HousingApi[] = [];
      for await (const housing of stream) {
        actual.push(housing);
      }

      expect(actual).toSatisfyAll((housing) =>
        establishment.geoCodes.includes(housing.geoCode)
      );
    });

    it('should use building class_dpe for energyConsumption, not housing energy_consumption_bdnb', async () => {
      const geoCode = oneOf(establishment.geoCodes);
      const building = genBuildingApi({ hasEnergyConsumption: true });
      building.dpe!.class = 'F';
      await factories.building.create(building);
      const housing = await factories.housing.create({
        geoCode,
        buildingId: building.id,
        energyConsumption: 'A'
      });

      const stream = housingRepository.stream({
        filters: { localities: [geoCode] },
        includes: ['buildings']
      });
      const actual: HousingApi[] = [];
      for await (const h of stream) {
        if (h.id === housing.id) actual.push(h);
      }

      expect(actual).toHaveLength(1);
      expect(actual[0].energyConsumption).toBe('F');
    });
  });

  describe('save', () => {
    it('should create a housing if it does not exist', async () => {
      const housing = genHousingApi(oneOf(establishment.geoCodes));

      await housingRepository.save(housing);

      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('id', '=', housing.id)
        .executeTakeFirst();
      expect(actual).toBeDefined();
    });

    it('should update all fields of an existing housing', async () => {
      const original = await factories.housing.create({
        geoCode: oneOf(establishment.geoCodes)
      });
      const update: HousingApi = {
        ...original,
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.COMMERCIAL_OR_OFFICE
      };

      await housingRepository.save(update, { onConflict: 'merge' });

      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('id', '=', original.id)
        .executeTakeFirst();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        occupancyIntended: update.occupancyIntended
      });
    });

    it('should update specific fields of an existing housing', async () => {
      const original = await factories.housing.create({
        geoCode: oneOf(establishment.geoCodes),
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.RENT
      });
      const update: HousingApi = {
        ...original,
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.COMMERCIAL_OR_OFFICE
      };

      await housingRepository.save(update, {
        onConflict: 'merge',
        merge: ['occupancy']
      });

      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('id', '=', original.id)
        .executeTakeFirst();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        occupancyIntended: original.occupancyIntended
      });
    });

    it('should preserve read-only columns (plot_area, occupancy_history) on a merge-all upsert', async () => {
      const original = genHousingApi(oneOf(establishment.geoCodes));
      // plotArea/occupancyHistory are LOVAC-imported and never written by the
      // API path (toHousingInsert forces them to null), so seed them directly.
      await kysely
        .insertInto('fastHousing')
        .values({
          ...toHousingInsert(original),
          plotArea: 500,
          occupancyHistory: 'V;2020'
        })
        .execute();
      const update: HousingApi = { ...original, occupancy: Occupancy.RENT };

      await housingRepository.save(update, { onConflict: 'merge' });

      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('id', '=', original.id)
        .executeTakeFirst();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        plotArea: 500,
        occupancyHistory: 'V;2020'
      });
    });
  });

  describe('updateMany', () => {
    it('should remove the substatus correctly', async () => {
      const housing = await factories.housing.create({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'N’habite pas à l’adresse indiquée'
      });

      await housingRepository.updateMany(
        [{ geoCode: housing.geoCode, id: housing.id }],
        {
          status: HousingStatus.NEVER_CONTACTED,
          subStatus: null
        }
      );

      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('geoCode', '=', housing.geoCode)
        .where('id', '=', housing.id)
        .executeTakeFirst();
      expect(actual).toMatchObject({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      });
    });

    it('should return the ids of the rows actually updated', async () => {
      const housing = await factories.housing.create({
        status: HousingStatus.FIRST_CONTACT,
        subStatus: 'N’habite pas à l’adresse indiquée'
      });

      const actual = await housingRepository.updateMany(
        [{ geoCode: housing.geoCode, id: housing.id }],
        { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
      );

      expect(actual).toStrictEqual([
        { geoCode: housing.geoCode, id: housing.id }
      ]);
    });

    describe('onlyIfStatus', () => {
      it('updates only the rows whose current status matches', async () => {
        const matching = await factories.housing.create({
          status: HousingStatus.NEVER_CONTACTED,
          subStatus: null
        });
        const nonMatching = await factories.housing.create({
          status: HousingStatus.FIRST_CONTACT,
          subStatus: null
        });

        const actual = await housingRepository.updateMany(
          [
            { geoCode: matching.geoCode, id: matching.id },
            { geoCode: nonMatching.geoCode, id: nonMatching.id }
          ],
          { status: HousingStatus.WAITING, subStatus: null },
          { onlyIfStatus: HousingStatus.NEVER_CONTACTED }
        );

        expect(actual).toStrictEqual([
          { geoCode: matching.geoCode, id: matching.id }
        ]);

        const rows = await kysely
          .selectFrom('fastHousing')
          .select(['geoCode', 'id', 'status'])
          .where('geoCode', 'in', [matching.geoCode, nonMatching.geoCode])
          .where('id', 'in', [matching.id, nonMatching.id])
          .execute();
        expect(rows).toIncludeAllMembers([
          {
            geoCode: matching.geoCode,
            id: matching.id,
            status: HousingStatus.WAITING
          },
          {
            geoCode: nonMatching.geoCode,
            id: nonMatching.id,
            status: HousingStatus.FIRST_CONTACT
          }
        ]);
      });

      it('returns an empty array and writes nothing when no row matches onlyIfStatus', async () => {
        const housing = await factories.housing.create({
          status: HousingStatus.WAITING,
          subStatus: null
        });

        const actual = await housingRepository.updateMany(
          [{ geoCode: housing.geoCode, id: housing.id }],
          { status: HousingStatus.NEVER_CONTACTED },
          { onlyIfStatus: HousingStatus.FIRST_CONTACT }
        );

        expect(actual).toStrictEqual([]);
        const row = await kysely
          .selectFrom('fastHousing')
          .select('status')
          .where('geoCode', '=', housing.geoCode)
          .where('id', '=', housing.id)
          .executeTakeFirstOrThrow();
        expect(row.status).toBe(HousingStatus.WAITING);
      });
    });
  });

  describe('remove', () => {
    it('should remove the links with a campaign in cascade', async () => {
      const housing = await factories.housing.create();
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      await housingRepository.remove(housing);

      const actual = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
      expect(actual).toBeArrayOfSize(0);
    });
  });

  it('should save null values', async () => {
    const housing = await factories.housing.create({
      subStatus: 'Sortie de la vacance'
    });

    await kysely
      .updateTable('fastHousing')
      .set({ subStatus: null })
      .where('geoCode', '=', housing.geoCode)
      .where('id', '=', housing.id)
      .execute();

    const actual = await kysely
      .selectFrom('fastHousing')
      .selectAll('fastHousing')
      .where('geoCode', '=', housing.geoCode)
      .where('id', '=', housing.id)
      .executeTakeFirst();
    expect(actual).toMatchObject({
      subStatus: null
    });
  });
});
