import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import {
  AddressKinds,
  BENEFIARY_COUNT_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  DataFileYear,
  ENERGY_CONSUMPTION_VALUES,
  fromHousing,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
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
  OwnershipKind,
  Precision,
  READ_ONLY_OCCUPANCY_VALUES,
  READ_WRITE_OCCUPANCY_VALUES,
  RELATIVE_LOCATION_VALUES,
  ROOM_COUNT_VALUES,
  type RelativeLocationFilter
} from '@zerologementvacant/models';
import { genGeoCode } from '@zerologementvacant/models/fixtures';
import { isDefined } from '@zerologementvacant/utils';
import async from 'async';
import { differenceInYears, endOfYear } from 'date-fns';
import { Array, Predicate, Record } from 'effect';
import fp from 'lodash/fp';
import { match } from 'ts-pattern';

import { flow } from 'effect/Function';
import { AddressApi } from '~/models/AddressApi';
import { BuildingApi } from '~/models/BuildingApi';
import { CampaignApi } from '~/models/CampaignApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { LocalityApi } from '~/models/LocalityApi';
import { OwnerApi } from '~/models/OwnerApi';
import {
  Addresses,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import {
  formatGeoPerimeterApi,
  GeoPerimeters
} from '~/repositories/geoRepository';
import {
  HousingPrecisionDBO,
  HousingPrecisions,
  Precisions
} from '~/repositories/precisionRepository';
import {
  genAddressApi,
  genBuildingApi,
  genCampaignApi,
  genEstablishmentApi,
  genGeoPerimeterApi,
  genGroupApi,
  genHousingApi,
  genLocalityApi,
  genOwnerApi,
  genUserApi,
  manyOf,
  oneOf
} from '~/test/testFixtures';
import {
  Buildings,
  formatBuildingApi,
  parseBuildingApi,
  type BuildingDBO
} from '../buildingRepository';
import {
  CampaignsHousing,
  formatCampaignHousingApi
} from '../campaignHousingRepository';
import { Campaigns, formatCampaignApi } from '../campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing
} from '../groupRepository';
import {
  formatHousingOwnersApi,
  HousingOwnerDBO,
  HousingOwners,
  relativeLocationFilterToDBO,
  toRelativeLocationDBO
} from '../housingOwnerRepository';
import housingRepository, {
  formatHousingRecordApi,
  Housing,
  ReferenceDataYear
} from '../housingRepository';
import { formatLocalityApi, Localities } from '../localityRepository';
import { formatOwnerApi, Owners } from '../ownerRepository';
import { formatUserApi, Users } from '../userRepository';

describe('Housing repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('find', () => {
    it('should return housings that have no main owner', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));

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
      const housings = faker.helpers.multiple(() => genHousingApi());
      await Housing().insert(housings.map(formatHousingRecordApi));
      const owners = faker.helpers.multiple(() => genOwnerApi());
      await Owners().insert(owners.map(formatOwnerApi));
      const housingOwners = housings.flatMap((housing) =>
        formatHousingOwnersApi(housing, [faker.helpers.arrayElement(owners)])
      );
      await HousingOwners().insert(housingOwners);
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
      const housings = faker.helpers.multiple(() => genHousingApi());
      await Housing().insert(housings.map(formatHousingRecordApi));
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
      const housingOwners = housings.flatMap((housing) =>
        formatHousingOwnersApi(housing, [owner])
      );
      await HousingOwners().insert(housingOwners);

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
      const precisions: Precision[] = await Precisions().limit(3);
      const housings: HousingApi[] = faker.helpers.multiple(
        () => genHousingApi(),
        { count: 3 }
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      const housingPrecisions: HousingPrecisionDBO[] = precisions.flatMap(
        (precision) => {
          return housings.map((housing) => ({
            housing_geo_code: housing.geoCode,
            housing_id: housing.id,
            precision_id: precision.id,
            created_at: new Date()
          }));
        }
      );
      await HousingPrecisions().insert(housingPrecisions);

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
        const houses: HousingApi[] = faker.helpers
          .multiple(
            () =>
              genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
            { count: 4 }
          )
          // Should not return this one
          .concat(genHousingApi());
        await Housing().insert(houses.map(formatHousingRecordApi));

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
        const housings: HousingApi[] = faker.helpers.multiple(
          () => genHousingApi(),
          { count: 4 }
        );
        const includedHousings = housings.slice(0, 1);
        const excludedHousings = housings.slice(1);
        await Housing().insert(housings.map(formatHousingRecordApi));

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
            kind: 'ME'
          };

          await Establishments().insert(
            formatEstablishmentApi(intercommunality)
          );
          const housings: HousingApi[] = [
            ...faker.helpers.multiple(
              () => genHousingApi(faker.helpers.arrayElement(geoCodes)),
              { count: 3 }
            ),
            ...faker.helpers.multiple(() => genHousingApi(), { count: 3 })
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
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
          const housings: HousingApi[] = OCCUPANCY_VALUES.map((occupancy) => ({
            ...genHousingApi(),
            occupancy
          }));
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
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
          const housing: HousingApi = genHousingApi(undefined, building);
          await Buildings().insert(formatBuildingApi(building));
          await Housing().insert(formatHousingRecordApi(housing));

          const actual = await housingRepository.find({
            filters: {
              energyConsumption: [null]
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          const buildings = await Buildings().whereIn(
            'id',
            actual.map((housing) => housing.buildingId)
          );
          expect(buildings).toSatisfyAll<Partial<BuildingDBO>>((building) => {
            return building.class_dpe === null;
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
            const housing = genHousingApi(undefined, building);
            await Buildings().insert(formatBuildingApi(building));
            await Housing().insert(formatHousingRecordApi(housing));

            const actual = await housingRepository.find({
              filters: {
                energyConsumption: [energyConsumption]
              }
            });

            const buildings = await Buildings().whereIn(
              'id',
              actual.map((housing) => housing.buildingId)
            );
            expect(buildings).toSatisfyAll<BuildingDBO>((building) => {
              return building.class_dpe === energyConsumption;
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
          const housings = buildings.map((building) =>
            genHousingApi(undefined, building)
          );
          await Buildings().insert(buildings.map(formatBuildingApi));
          await Housing().insert(housings.map(formatHousingRecordApi));

          const actual = await housingRepository.find({
            filters: {
              energyConsumption: energyConsumptions
            }
          });

          const actualBuildings = await Buildings().whereIn(
            'id',
            actual.map((housing) => housing.buildingId)
          );
          expect(actualBuildings).toSatisfyAll<BuildingDBO>((building) => {
            return energyConsumptions.includes(building.class_dpe);
          });
        });
      });

      it('should filter by establishment', async () => {
        const otherEstablishment = genEstablishmentApi();
        await Establishments().insert(
          formatEstablishmentApi(otherEstablishment)
        );
        const houses: HousingApi[] = [
          genHousingApi(oneOf(establishment.geoCodes)),
          genHousingApi(oneOf(otherEstablishment.geoCodes))
        ];
        await Housing().insert(houses.map(formatHousingRecordApi));

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
        const groups = faker.helpers.multiple(
          () => genGroupApi(user, establishment),
          { count: 2 }
        );
        await Groups().insert(groups.map(formatGroupApi));
        const housesByGroup = fp.fromPairs(
          groups.map((group) => {
            const houses: HousingApi[] = faker.helpers.multiple(
              () => genHousingApi(oneOf(establishment.geoCodes)),
              { count: 3 }
            );
            return [group.id, houses];
          })
        );
        const houses: HousingApi[] = fp.values(housesByGroup).flat();
        await Housing().insert(houses.map(formatHousingRecordApi));
        await GroupsHousing().insert(
          groups.flatMap((group) => {
            return formatGroupHousingApi(
              group,
              manyOf(
                housesByGroup[group.id],
                faker.number.int({ min: 1, max: 3 })
              )
            );
          })
        );
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
        let campaigns: ReadonlyArray<CampaignApi>;

        beforeEach(async () => {
          campaigns = faker.helpers.multiple(
            () => genCampaignApi(establishment.id, user.id),
            { count: 3 }
          );
          await Campaigns().insert(campaigns.map(formatCampaignApi));
          const campaignHousings = campaigns.map((campaign) => {
            return {
              campaign: campaign,
              housings: faker.helpers.multiple(() => genHousingApi(), {
                count: 3
              })
            };
          });
          const housings = campaignHousings.flatMap(({ housings }) => housings);
          await Housing().insert(housings.map(formatHousingRecordApi));
          await CampaignsHousing().insert(
            campaignHousings.flatMap((ch) => {
              return formatCampaignHousingApi(ch.campaign, ch.housings);
            })
          );
        });

        it('should keep housings that are not in a campaign', async () => {
          const housing = genHousingApi();
          await Housing().insert(formatHousingRecordApi(housing));

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
          const owners: OwnerApi[] = [
            createOwner(null),
            createOwner(39),
            createOwner(40),
            createOwner(59),
            createOwner(60),
            createOwner(74),
            createOwner(75),
            createOwner(99),
            createOwner(100)
          ];
          await Owners().insert(owners.map(formatOwnerApi));
          const housingList: HousingApi[] = owners.map(() => genHousingApi());
          await Housing().insert(housingList.map(formatHousingRecordApi));
          await HousingOwners().insert(
            housingList.flatMap((housing, i) =>
              formatHousingOwnersApi(housing, owners.slice(i, i + 1))
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
        const housings = faker.helpers.multiple(() => genHousingApi(), {
          count: 3
        });
        await Housing().insert(housings.map(formatHousingRecordApi));
        await Owners().insert(
          housings.map((housing) => formatOwnerApi(housing.owner))
        );
        await HousingOwners().insert(
          housings.flatMap((housing) =>
            formatHousingOwnersApi(housing, [housing.owner])
          )
        );

        const actual = await housingRepository.find({
          filters: {
            ownerIds: housings.map((housing) => housing.owner.id)
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
          const housings = faker.helpers.multiple(() => genHousingApi(), {
            count: kinds.length
          });
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owners: OwnerApi[] = Object.values(OWNER_KIND_LABELS).map(
            (kind, i) => {
              return { ...housings[i].owner, kind };
            }
          );
          await Owners().insert(owners.map(formatOwnerApi));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [housing.owner])
            )
          );
        });

        it('should keep owners that have an empty kind', async () => {
          const housing = genHousingApi();
          await Housing().insert(formatHousingRecordApi(housing));
          const owner: OwnerApi = {
            ...genOwnerApi(),
            kind: null
          };
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            formatHousingOwnersApi(housing, [owner])
          );

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
            const housing = genHousingApi();
            const owner = genOwnerApi();
            await Housing().insert(formatHousingRecordApi(housing));
            await Owners().insert(formatOwnerApi(owner));
            const [housingOwnerRow] = formatHousingOwnersApi(housing, [owner]);
            await HousingOwners().insert({
              ...housingOwnerRow,
              locprop_relative_ban: toRelativeLocationDBO(relativeLocation)
            });
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

            const actualHousingOwners = await HousingOwners()
              .where({ rank: 1 })
              .whereIn(
                ['housing_geo_code', 'housing_id'],
                actual.map((housing) => [housing.geoCode, housing.id])
              );
            expect(actualHousingOwners).toSatisfyAll<HousingOwnerDBO>(
              (housing) => {
                return (
                  housing.locprop_relative_ban !== null &&
                  relativeLocationFilterToDBO(filter).includes(
                    housing.locprop_relative_ban
                  )
                );
              }
            );
          }
        );
      });

      describe('by multi owners', () => {
        beforeEach(async () => {
          const housings = faker.helpers.multiple(() => genHousingApi(), {
            count: 3
          });
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          const anotherOwner = genOwnerApi();
          await Owners().insert([owner, anotherOwner].map(formatOwnerApi));
          const housingOwners = housings
            .slice(0, 2)
            .flatMap((housing) => formatHousingOwnersApi(housing, [owner]))
            .concat(
              housings
                .slice(2)
                .flatMap((housing) =>
                  formatHousingOwnersApi(housing, [anotherOwner])
                )
            );
          await HousingOwners().insert(housingOwners);
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
          const housings = faker.helpers.multiple(() => genHousingApi(), {
            count: BENEFIARY_COUNT_VALUES.length
          });
          await Housing().insert(housings.map(formatHousingRecordApi));
          const housingOwners = housings.map((housing, i) => {
            return {
              housing,
              owners: faker.helpers.multiple(() => genOwnerApi(), {
                count: i
              })
            };
          });
          const owners = housingOwners.flatMap(
            (housingOwner) => housingOwner.owners
          );
          await Owners().insert(owners.map(formatOwnerApi));
          await HousingOwners().insert(
            housingOwners.flatMap((housingOwner) => {
              return formatHousingOwnersApi(
                housingOwner.housing,
                housingOwner.owners
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
              predicate(housingOwners: ReadonlyArray<HousingOwnerDBO>) {
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
            predicate(housingOwners: ReadonlyArray<HousingOwnerDBO>) {
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
            predicate(housingOwners: ReadonlyArray<HousingOwnerDBO>) {
              const isActive = (housingOwner: HousingOwnerDBO) =>
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
            const actualHousingOwners = await HousingOwners().where({
              housing_geo_code: housing.geoCode,
              housing_id: housing.id
            });
            expect(actualHousingOwners).toSatisfy<
              ReadonlyArray<HousingOwnerDBO>
            >(predicate);
          });
        });
      });

      describe('by housing kind', () => {
        beforeEach(async () => {
          const housings = HOUSING_KIND_VALUES.map((kind) => {
            return { ...genHousingApi(), kind };
          });
          await Housing().insert(housings.map(formatHousingRecordApi));
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
          const housingList: HousingApi[] = [
            { ...genHousingApi(), livingArea: 34 },
            { ...genHousingApi(), livingArea: 35 },
            { ...genHousingApi(), livingArea: 74 },
            { ...genHousingApi(), livingArea: 75 },
            { ...genHousingApi(), livingArea: 99 },
            { ...genHousingApi(), livingArea: 100 }
          ];
          await Housing().insert(housingList.map(formatHousingRecordApi));
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
          const housings = faker.helpers
            .multiple(() => genHousingApi(), { count: 10 })
            .map((housing, i) => ({
              ...housing,
              roomsCount: i + 1
            }));
          await Housing().insert(housings.map(formatHousingRecordApi));
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
          const housings: ReadonlyArray<HousingApi> =
            cadastralClassifications.map((cadastralClassification) => {
              return { ...genHousingApi(), cadastralClassification };
            });
          await Housing().insert(housings.map(formatHousingRecordApi));
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
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), buildingYear: 1918 },
            { ...genHousingApi(), buildingYear: 1919 },
            { ...genHousingApi(), buildingYear: 1945 },
            { ...genHousingApi(), buildingYear: 1946 },
            { ...genHousingApi(), buildingYear: 1990 },
            { ...genHousingApi(), buildingYear: 1991 }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
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
          const housingList: HousingApi[] = faker.helpers
            .multiple(() => genHousingApi(), { count: 16 })
            .map((housing, i) => ({
              ...housing,
              vacancyStartYear: ReferenceDataYear - i
            }))
            .concat([
              {
                ...genHousingApi(),
                vacancyStartYear: 0
              }
            ]);
          await Housing().insert(housingList.map(formatHousingRecordApi));
        });

        const tests = [
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
              (housing.vacancyStartYear as number) === 0
          },
          {
            name: '2022 (incohérence donnée source)',
            filter: ['inconsistency2022'],
            predicate: (housing: HousingApi) =>
              (housing.vacancyStartYear as number) === 2022
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
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), taxed: true },
            { ...genHousingApi(), taxed: false },
            { ...genHousingApi(), taxed: null }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
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
          const housings: ReadonlyArray<HousingApi> = [
            // Monopropriété
            { ...genHousingApi(), ownershipKind: 'single' },
            { ...genHousingApi(), ownershipKind: null },
            // Copropriété
            { ...genHousingApi(), ownershipKind: 'CL' },
            { ...genHousingApi(), ownershipKind: 'co' },
            { ...genHousingApi(), ownershipKind: 'CLV' },
            { ...genHousingApi(), ownershipKind: 'CV' },
            // Autre
            { ...genHousingApi(), ownershipKind: 'BND' },
            { ...genHousingApi(), ownershipKind: 'MP' },
            { ...genHousingApi(), ownershipKind: 'TF' }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
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
        function createHousingByBuilding(building: BuildingApi): HousingApi[] {
          return faker.helpers.multiple(
            () => ({
              ...genHousingApi(),
              buildingId: building.id
            }),
            { count: building.housingCount }
          );
        }

        beforeEach(async () => {
          const testAmounts = [4, 5, 19, 20, 49, 50];

          const buildings: BuildingApi[] = testAmounts.map((amount) => {
            return {
              ...genBuildingApi(),
              housingCount: amount
            };
          });
          await Buildings().insert(buildings.map(formatBuildingApi));

          const housingByBuilding: HousingApi[][] = buildings.map((building) =>
            createHousingByBuilding(building)
          );
          const housingList = housingByBuilding.flat();
          await Housing().insert(housingList.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housingList.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
            )
          );
        });

        const tests = [
          {
            name: 'less than 5',
            filter: ['lt5'],
            predicate: (building: BuildingApi) => {
              return building.housingCount < 5;
            }
          },
          {
            name: 'between 5 and 19',
            filter: ['5to19'],
            predicate: (building: BuildingApi) => {
              return 5 <= building.housingCount && building.housingCount <= 19;
            }
          },
          {
            name: 'between 20 and 49',
            filter: ['20to49'],
            predicate: (building: BuildingApi) => {
              return 20 <= building.housingCount && building.housingCount <= 49;
            }
          },
          {
            name: '50 and more',
            filter: ['gte50'],
            predicate: (building: BuildingApi) => {
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
          const buildings = await Buildings()
            .whereIn('id', ids)
            .then((buildings) => buildings.map(parseBuildingApi));
          expect(buildings).toSatisfyAll<BuildingApi>(predicate);
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

          const buildings: BuildingApi[] = testAmounts.map(
            ({ vacant, total }) => {
              return {
                ...genBuildingApi(),
                vacantHousingCount: vacant,
                housingCount: total
              };
            }
          );
          await Buildings().insert(buildings.map(formatBuildingApi));

          const housingByBuilding: HousingApi[][] = buildings.map((building) =>
            createHousingByBuilding(building)
          );
          const housingList = housingByBuilding.flat();
          await Housing().insert(housingList.map(formatHousingRecordApi));
        });

        const tests = [
          {
            name: 'less than 20 %',
            filter: ['lt20'],
            predicate: (building: BuildingApi) => {
              return building.vacantHousingCount / building.housingCount < 0.2;
            }
          },
          {
            name: 'between 20 and 39 %',
            filter: ['20to39'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.2 <= rate && rate <= 0.39;
            }
          },
          {
            name: 'between 40 and 59 %',
            filter: ['40to59'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.4 <= rate && rate <= 0.59;
            }
          },
          {
            name: 'between 60 and 79 %',
            filter: ['60to79'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.6 <= rate && rate <= 0.79;
            }
          },
          {
            name: '80 % and more',
            filter: ['gte80'],
            predicate: (building: BuildingApi) => {
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
          const buildings = await Buildings()
            .whereIn('id', ids)
            .then((buildings) => buildings.map(parseBuildingApi));
          expect(buildings).toSatisfyAll<BuildingApi>(predicate);
        });
      });

      describe('by locality', () => {
        const geoCodes = ['12345', '23456', '34567'];

        beforeEach(async () => {
          const housings = geoCodes.map((geoCode) => genHousingApi(geoCode));
          await Housing().insert(housings.map(formatHousingRecordApi));
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
          await Localities().insert(formatLocalityApi(locality));
          const housing = genHousingApi(locality.geoCode);
          await Housing().insert(formatHousingRecordApi(housing));

          const actual = await housingRepository.find({
            filters: {
              localityKinds: [null]
            }
          });

          const actualLocalities =
            await Localities().whereNull('locality_kind');
          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return actualLocalities.some(
              (locality) => locality.geo_code === housing.geoCode
            );
          });
        });

        it('should filter by locality kind', async () => {
          const localities: LocalityApi[] = [
            { ...genLocalityApi(), kind: 'ACV' },
            { ...genLocalityApi(), kind: 'PVD' }
          ];
          await Localities().insert(localities.map(formatLocalityApi));
          const housingList = faker.helpers.multiple(
            () => {
              const geoCode = oneOf(localities).geoCode;
              return genHousingApi(geoCode);
            },
            { count: 10 }
          );
          await Housing().insert(housingList.map(formatHousingRecordApi));

          const actual = await housingRepository.find({
            filters: {
              localityKinds: ['ACV', 'PVD']
            }
          });

          const actualLocalities = await Localities().whereIn('locality_kind', [
            'ACV',
            'PVD'
          ]);
          expect(actual).toSatisfyAll<HousingApi>((housing) =>
            actualLocalities
              .map((locality) => locality.geo_code)
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
          await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), longitude: 2.5, latitude: 48.5 },
            { ...genHousingApi(), longitude: 2, latitude: 47.9 },
            { ...genHousingApi(), longitude: 1.9, latitude: 48 }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

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
          await GeoPerimeters().insert(formatGeoPerimeterApi(perimeter));
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), longitude: 2.5, latitude: 48.5 },
            { ...genHousingApi(), longitude: 2, latitude: 47.9 },
            { ...genHousingApi(), longitude: 1.9, latitude: 48 }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

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
          const housings = faker.helpers.multiple(() => genHousingApi(), {
            count: 10
          });
          await Housing().insert(housings.map(formatHousingRecordApi));
        });

        it('should keep housings that have no data file years', async () => {
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), dataFileYears: [] }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

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
          const housings: ReadonlyArray<HousingApi> = [
            {
              ...genHousingApi(),
              source: 'datafoncier-manual',
              dataFileYears: ['ff-2024']
            },
            {
              ...genHousingApi(),
              source: 'lovac',
              dataFileYears: ['lovac-2024']
            }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

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
        beforeEach(() => {
          const housings = faker.helpers.multiple(() => genHousingApi(), {
            count: 10
          });
          return Housing().insert(housings.map(formatHousingRecordApi));
        });

        it('should skip housings that have no data file years', async () => {
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), dataFileYears: [] }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

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
          const housings: ReadonlyArray<HousingApi> = [
            {
              ...genHousingApi(),
              source: 'datafoncier-manual',
              dataFileYears: ['ff-2024']
            },
            {
              ...genHousingApi(),
              source: 'lovac',
              dataFileYears: ['lovac-2024']
            }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));

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
      });

      describe('by status', () => {
        beforeEach(async () => {
          const housings: ReadonlyArray<HousingApi> = HOUSING_STATUS_VALUES.map(
            (status) => {
              return { ...genHousingApi(), status };
            }
          );
          await Housing().insert(housings.map(formatHousingRecordApi));
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
          const housings: ReadonlyArray<HousingApi> = [
            { ...genHousingApi(), subStatus: substatus },
            { ...genHousingApi(), subStatus: 'Autre' }
          ];
          await Housing().insert(housings.map(formatHousingRecordApi));
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
        const housingList = faker.helpers.multiple(() => genHousingApi(), {
          count: 10
        });
        await Housing().insert(housingList.map(formatHousingRecordApi));
        const owner: OwnerApi = {
          ...genOwnerApi(),
          fullName: 'Jean Dupont'
        };
        await Owners().insert(formatOwnerApi(owner));
        await HousingOwners().insert(
          housingList.flatMap((housing) =>
            formatHousingOwnersApi(housing, [owner])
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
            function createHousingWithMutation(year: number): HousingApi {
              const date = faker.date.between({
                from: year.toString(),
                to: endOfYear(year.toString())
              });
              const bool = faker.datatype.boolean();
              return {
                ...genHousingApi(),
                lastTransactionDate: bool ? date.toJSON() : null,
                lastMutationDate: bool ? null : date.toJSON()
              };
            }

            const housings: HousingApi[] = [];
            for (let i = 2000; i <= 2024; i++) {
              housings.push(createHousingWithMutation(i));
            }
            housings.push({
              ...genHousingApi(),
              lastMutationDate: null,
              lastTransactionDate: null,
              lastTransactionValue: null
            });
            await Housing().insert(housings.map(formatHousingRecordApi));
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
            ): Promise<ReadonlyArray<HousingApi>> {
              const housings = types.map((type) => {
                return match(type)
                  .returnType<HousingApi>()
                  .with('donation', () => ({
                    ...genHousingApi(),
                    lastMutationType: type,
                    lastMutationDate: '2024-01-01',
                    lastTransactionDate: '2020-01-01',
                    lastTransactionValue: null
                  }))
                  .with('sale', () => ({
                    ...genHousingApi(),
                    lastMutationType: type,
                    lastMutationDate: '2023-01-01',
                    lastTransactionDate: '2024-01-01',
                    lastTransactionValue: 1_000_000
                  }))
                  .with(null, () => ({
                    ...genHousingApi(),
                    lastMutationType: type,
                    lastMutationDate: null,
                    lastTransactionDate: null,
                    lastTransactionValue: null
                  }))
                  .exhaustive();
              });
              await Housing().insert(housings.map(formatHousingRecordApi));
              return housings;
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
            const housings = payloads.map((payload) => ({
              ...genHousingApi(),
              ...payload
            }));
            await Housing().insert(housings.map(formatHousingRecordApi));
            return housings;
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

  describe('findOne', () => {
    const housing: HousingApi = genHousingApi(oneOf(establishment.geoCodes));
    const owner: OwnerApi = genOwnerApi();
    const address: AddressApi = genAddressApi(owner.id, AddressKinds.Owner);

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));
      await Owners().insert(formatOwnerApi(owner));
      await HousingOwners().insert(formatHousingOwnersApi(housing, [owner]));
      await Addresses().insert(formatAddressApi(address));
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
    const houses: HousingApi[] = faker.helpers.multiple(
      () => genHousingApi(oneOf(establishment.geoCodes)),
      { count: 5 }
    );

    beforeAll(async () => {
      await Housing().insert(houses.map(formatHousingRecordApi));
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
  });

  describe('save', () => {
    it('should create a housing if it does not exist', async () => {
      const housing = genHousingApi(oneOf(establishment.geoCodes));

      await housingRepository.save(housing);

      const actual = await Housing().where('id', housing.id).first();
      expect(actual).toBeDefined();
    });

    it('should update all fields of an existing housing', async () => {
      const original = genHousingApi(oneOf(establishment.geoCodes));
      await Housing().insert(formatHousingRecordApi(original));
      const update: HousingApi = {
        ...original,
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.COMMERCIAL_OR_OFFICE
      };

      await housingRepository.save(update, { onConflict: 'merge' });

      const actual = await Housing().where('id', original.id).first();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        occupancy_intended: update.occupancyIntended
      });
    });

    it('should update specific fields of an existing housing', async () => {
      const original: HousingApi = {
        ...genHousingApi(oneOf(establishment.geoCodes)),
        occupancy: Occupancy.VACANT,
        occupancyIntended: Occupancy.RENT
      };
      await Housing().insert(formatHousingRecordApi(original));
      const update: HousingApi = {
        ...original,
        occupancy: Occupancy.RENT,
        occupancyIntended: Occupancy.COMMERCIAL_OR_OFFICE
      };

      await housingRepository.save(update, {
        onConflict: 'merge',
        merge: ['occupancy']
      });

      const actual = await Housing().where('id', original.id).first();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        occupancy_intended: original.occupancyIntended
      });
    });
  });

  describe('remove', () => {
    it('should remove the links with a campaign in cascade', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));
      const campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsHousing().insert(
        formatCampaignHousingApi(campaign, [housing])
      );

      await housingRepository.remove(housing);

      const actual = await CampaignsHousing().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      expect(actual).toBeArrayOfSize(0);
    });
  });

  it('should save null values', async () => {
    const housing: HousingApi = {
      ...genHousingApi(),
      subStatus: 'Sortie de la vacance'
    };
    await Housing().insert(formatHousingRecordApi(housing));

    await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .update({
        sub_status: null
      });

    const actual = await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .first();
    expect(actual).toMatchObject({
      sub_status: null
    });
  });
});
