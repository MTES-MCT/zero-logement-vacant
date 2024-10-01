import { faker } from '@faker-js/faker/locale/fr';
import { differenceInYears } from 'date-fns';
import fp from 'lodash/fp';

import { Predicate } from '@zerologementvacant/utils';
import { isDefined } from '@zerologementvacant/shared';
import housingRepository, {
  formatHousingRecordApi,
  Housing,
  ReferenceDataYear
} from '../housingRepository';
import {
  genAddressApi,
  genBuildingApi,
  genCampaignApi,
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genLocalityApi,
  genOwnerApi,
  genUserApi,
  manyOf,
  oneOf
} from '~/test/testFixtures';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing
} from '../groupRepository';
import { formatOwnerApi, Owners } from '../ownerRepository';
import {
  formatHousingOwnerApi,
  formatHousingOwnersApi,
  HousingOwnerDBO,
  HousingOwners
} from '../housingOwnerRepository';
import {
  EnergyConsumptionGradesApi,
  HousingApi,
  OccupancyKindApi
} from '~/models/HousingApi';
import { formatLocalityApi, Localities } from '../localityRepository';
import { LocalityApi } from '~/models/LocalityApi';
import { BuildingApi } from '~/models/BuildingApi';
import {
  Buildings,
  formatBuildingApi,
  parseBuildingApi
} from '../buildingRepository';
import async from 'async';
import { OwnerApi } from '~/models/OwnerApi';
import {
  CampaignsHousing,
  formatCampaignHousingApi
} from '../campaignHousingRepository';
import { Campaigns, formatCampaignApi } from '../campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import { formatUserApi, Users } from '../userRepository';
import { AddressApi } from '~/models/AddressApi';
import {
  AddressKinds,
  BENEFIARY_COUNT_VALUES,
  HOUSING_KIND_VALUES,
  isSecondaryOwner,
  OWNERSHIP_KINDS
} from '@zerologementvacant/models';
import {
  Addresses,
  formatAddressApi
} from '~/repositories/banAddressesRepository';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';

describe('Housing repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('find', () => {
    const housings = Array.from({ length: 10 }, () => genHousingApi());
    const owners = housings.map((housing) => housing.owner);
    const housingOwners: HousingOwnerApi[] = housings.map((housing) => ({
      ...housing.owner,
      ownerId: housing.owner.id,
      housingGeoCode: housing.geoCode,
      housingId: housing.id,
      rank: 1
    }));

    beforeAll(async () => {
      await Housing().insert(housings.map(formatHousingRecordApi));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));
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
      const owner = owners[0];

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

    describe('Filters', () => {
      it('should filter by housing ids', async () => {
        const houses: HousingApi[] = Array.from({ length: 4 })
          .map(() =>
            genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
          )
          // Should not return this one
          .concat(genHousingApi());
        await Housing().insert(houses.map(formatHousingRecordApi));

        const actual = await housingRepository.find({
          filters: {
            housingIds: houses.slice(0, 1).map((housing) => housing.id)
          }
        });

        expect(actual.length).toBeGreaterThanOrEqual(1);
        expect(actual).toSatisfyAll<HousingApi>((actualHousing) => {
          return houses.map((housing) => housing.id).includes(actualHousing.id);
        });
      });

      describe('by occupancy', () => {
        beforeEach(async () => {
          const housings: HousingApi[] = Object.values(OccupancyKindApi).map(
            (occupancy) => ({
              ...genHousingApi(),
              occupancy
            })
          );
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
            )
          );
        });

        test.each(Object.values(OccupancyKindApi))(
          'should filter by %s',
          async (occupancy) => {
            const actual = await housingRepository.find({
              filters: {
                occupancies: [occupancy]
              }
            });

            expect(actual.length).toBeGreaterThan(0);
            expect(actual).toSatisfyAll<HousingApi>(
              (housing) => housing.occupancy === occupancy
            );
          }
        );
      });

      it('should filter by DPE score', async () => {
        const actualA = await housingRepository.find({
          filters: {
            energyConsumption: ['A' as EnergyConsumptionGradesApi]
          }
        });
        expect(actualA).toSatisfyAll<HousingApi>(
          (housing) =>
            housing.energyConsumption === EnergyConsumptionGradesApi.A
        );

        const EFGClasses = [
          'E' as EnergyConsumptionGradesApi,
          'F' as EnergyConsumptionGradesApi,
          'G' as EnergyConsumptionGradesApi
        ];
        const actualEFG = await housingRepository.find({
          filters: {
            energyConsumption: EFGClasses
          }
        });
        expect(actualEFG).toSatisfyAll<HousingApi>((housing) =>
          EFGClasses.includes(
            housing.energyConsumption as EnergyConsumptionGradesApi
          )
        );
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
        const groups = Array.from({ length: 2 }).map(() =>
          genGroupApi(user, establishment)
        );
        await Groups().insert(groups.map(formatGroupApi));
        const housesByGroup = fp.fromPairs(
          groups.map((group) => {
            const houses: HousingApi[] = Array.from({ length: 3 }).map(() =>
              genHousingApi(oneOf(establishment.geoCodes))
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

      it('should filter by campaign id', async () => {
        const campaigns = Array.from({ length: 3 }, () =>
          genCampaignApi(establishment.id, user.id)
        );
        await Campaigns().insert(campaigns.map(formatCampaignApi));
        const campaignHousings = campaigns.map((campaign) => {
          return {
            campaign: campaign,
            housings: Array.from({ length: 3 }, () => genHousingApi())
          };
        });
        const housings = campaignHousings.flatMap(({ housings }) => housings);
        await Housing().insert(housings.map(formatHousingRecordApi));
        await CampaignsHousing().insert(
          campaignHousings.flatMap((ch) => {
            return formatCampaignHousingApi(ch.campaign, ch.housings);
          })
        );

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
            name: 'less than 35 m2',
            filter: ['lt35'],
            predicate: (housing: HousingApi) => housing.livingArea < 35
          },
          {
            name: 'between 35 and 74 m2',
            filter: ['35to74'],
            predicate: (housing: HousingApi) =>
              35 <= housing.livingArea && housing.livingArea <= 74
          },
          {
            name: 'between 75 and 99 m2',
            filter: ['75to99'],
            predicate: (housing: HousingApi) =>
              75 <= housing.livingArea && housing.livingArea <= 99
          },
          {
            name: 'more than 100 m2',
            filter: ['gte100'],
            predicate: (housing: HousingApi) => housing.livingArea >= 100
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

      describe('by vacancy duration', () => {
        beforeEach(async () => {
          const housingList: HousingApi[] = new Array(12)
            .fill('0')
            .map((_, i) => ({
              ...genHousingApi(),
              vacancyStartYear: ReferenceDataYear - i
            }));
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
            name: 'less than 2 years',
            filter: ['lt2'],
            predicate: (housing: HousingApi) =>
              ReferenceDataYear - (housing.vacancyStartYear as number) < 2
          },
          {
            name: '2 years',
            filter: ['2'],
            predicate: (housing: HousingApi) =>
              ReferenceDataYear - (housing.vacancyStartYear as number) === 2
          },
          {
            name: 'more than 2 years',
            filter: ['gt2'],
            predicate: (housing: HousingApi) =>
              ReferenceDataYear - (housing.vacancyStartYear as number) > 2
          },
          {
            name: 'between 3 and 4 years',
            filter: ['3to4'],
            predicate: (housing: HousingApi) => {
              const diff =
                ReferenceDataYear - (housing.vacancyStartYear as number);
              return 3 <= diff && diff <= 4;
            }
          },
          {
            name: 'between 5 and 9 years',
            filter: ['5to9'],
            predicate: (housing: HousingApi) => {
              const diff =
                ReferenceDataYear - (housing.vacancyStartYear as number);
              return 5 <= diff && diff <= 9;
            }
          },
          {
            name: '10 years and more',
            filter: ['gte10'],
            predicate: (housing: HousingApi) =>
              ReferenceDataYear - (housing.vacancyStartYear as number) >= 10
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              vacancyDurations: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(predicate);
        });
      });

      describe('by housing count by building', () => {
        function createHousingByBuilding(count: number): HousingApi[] {
          const buildingId = faker.string.alphanumeric(10);
          return new Array(count)
            .fill('0')
            .map(() => ({ ...genHousingApi(), buildingId }));
        }

        beforeEach(async () => {
          const housingByBuilding: HousingApi[][] = [
            createHousingByBuilding(4),
            createHousingByBuilding(5),
            createHousingByBuilding(19),
            createHousingByBuilding(20),
            createHousingByBuilding(49),
            createHousingByBuilding(50)
          ];
          const housingList = housingByBuilding.flat();
          await Housing().insert(housingList.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housingList.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
            )
          );
          const buildings: BuildingApi[] = housingByBuilding.map(
            (housingList) => genBuildingApi(housingList)
          );
          await Buildings().insert(buildings.map(formatBuildingApi));
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
        function createHousingByBuilding(
          vacant: number,
          other: number
        ): HousingApi[] {
          const buildingId = faker.string.alphanumeric(10);
          return new Array(vacant + other).fill('0').map((_, i) => ({
            ...genHousingApi(),
            buildingId,
            occupancy:
              i < vacant ? OccupancyKindApi.Vacant : OccupancyKindApi.Rent
          }));
        }

        beforeEach(async () => {
          const housingByBuilding: HousingApi[][] = [
            createHousingByBuilding(19, 81), // 19 %
            createHousingByBuilding(2, 8), // 20 %
            createHousingByBuilding(39, 61), // 39 %
            createHousingByBuilding(4, 6), // 40 %
            createHousingByBuilding(59, 41), // 59 %
            createHousingByBuilding(6, 4), // 60 %
            createHousingByBuilding(79, 21), // 79 %
            createHousingByBuilding(8, 2) // 80 %
          ];
          const housingList = housingByBuilding.flat();
          await Housing().insert(housingList.map(formatHousingRecordApi));
          const owner = genOwnerApi();
          await Owners().insert(formatOwnerApi(owner));
          await HousingOwners().insert(
            housingList.flatMap((housing) =>
              formatHousingOwnersApi(housing, [owner])
            )
          );
          const buildings: BuildingApi[] = housingByBuilding.map(
            (housingList) => genBuildingApi(housingList)
          );
          await Buildings().insert(buildings.map(formatBuildingApi));
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

      describe('by owner’s age', () => {
        function createOwner(age: number): OwnerApi {
          return {
            ...genOwnerApi(),
            birthDate: faker.date
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

        const tests = [
          {
            name: 'less than 40 years old',
            filter: ['lt40'],
            predicate: (owner: OwnerApi) => {
              return (
                differenceInYears(new Date(), owner.birthDate as string) < 40
              );
            }
          },
          {
            name: 'between 40 and 59 years old',
            filter: ['40to59'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as string
              );
              return 40 <= diff && diff <= 59;
            }
          },
          {
            name: 'between 60 and 74 years old',
            filter: ['60to74'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as string
              );
              return 60 <= diff && diff <= 74;
            }
          },
          {
            name: 'between 75 and 99 years old',
            filter: ['75to99'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as string
              );
              return 75 <= diff && diff <= 99;
            }
          },
          {
            name: '100 years old and more',
            filter: ['gte100'],
            predicate: (owner: OwnerApi) => {
              return (
                differenceInYears(new Date(), owner.birthDate as string) >= 100
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
          expect(actual).toSatisfyAll<HousingApi>(
            (housing) => !!housing.owner && predicate(housing.owner)
          );
        });
      });

      it('should filter by owner ids', async () => {
        const housings = Array.from({ length: 3 }, () => genHousingApi());
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
        beforeEach(async () => {
          const housings = Array.from({ length: OWNERSHIP_KINDS.length }, () =>
            genHousingApi()
          );
          await Housing().insert(housings.map(formatHousingRecordApi));
          const owners: OwnerApi[] = OWNERSHIP_KINDS.map((kind, i) => {
            return { ...housings[i].owner, kind };
          });
          await Owners().insert(owners.map(formatOwnerApi));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [housing.owner])
            )
          );
        });

        test.each(OWNERSHIP_KINDS)('should filter by %s', async (kind) => {
          const actual = await housingRepository.find({
            filters: {
              ownerKinds: [kind]
            }
          });

          expect(actual).toSatisfyAll<HousingApi>((housing) => {
            return housing.owner?.kind === kind;
          });
        });
      });

      describe('by multi owners', () => {
        beforeEach(async () => {
          const housings = Array.from({ length: 3 }, () => genHousingApi());
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
          expected: Predicate<number>
        ): (housings: ReadonlyArray<HousingApi>) => boolean {
          return fp.pipe(
            fp.map((housing: HousingApi) => housing.owner),
            fp.groupBy('id'),
            fp.mapValues(fp.size),
            fp.values,
            fp.every(expected)
          );
        }

        const tests = [
          {
            name: 'housings belonging to owners who have many properties',
            filter: ['true'],
            predicate: countOwners((count) => count > 1)
          },
          {
            name: 'housings belonging to owners who have only one property',
            filter: ['false'],
            predicate: countOwners((count) => count === 1)
          }
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              multiOwners: filter
            }
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfy<ReadonlyArray<HousingApi>>(predicate);
        });
      });

      describe('by beneficiary count', () => {
        beforeEach(async () => {
          const housings = Array.from(
            { length: BENEFIARY_COUNT_VALUES.length },
            () => genHousingApi()
          );
          await Housing().insert(housings.map(formatHousingRecordApi));
          const housingOwners = housings.map((housing, i) => {
            return {
              housing,
              owners: Array.from({ length: i + 1 }, () => genOwnerApi())
            };
          });
          const owners = housingOwners.flatMap(
            (housingOwner) => housingOwner.owners
          );
          await Owners().insert(owners.map(formatOwnerApi));
          await HousingOwners().insert(
            housingOwners.flatMap((housingOwner) =>
              formatHousingOwnersApi(housingOwner.housing, housingOwner.owners)
            )
          );
        });

        const tests = BENEFIARY_COUNT_VALUES.map(Number)
          .filter((count) => !Number.isNaN(count))
          .map((count) => {
            return {
              name: `housings that have ${count} secondary owner(s)`,
              filter: [String(count)],
              predicate(housingOwners: ReadonlyArray<HousingOwnerDBO>) {
                return (
                  housingOwners.filter((housingOwner) => housingOwner.rank >= 2)
                    .length === count
                );
              }
            };
          })
          .concat({
            name: `housings that have 5 or more secondary owners`,
            filter: ['gte5'],
            predicate(housingOwners: ReadonlyArray<HousingOwnerDBO>) {
              return housingOwners.filter(isSecondaryOwner).length >= 5;
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
          const owners = housings.map((housing) => housing.owner);
          await Owners().insert(owners.map(formatOwnerApi));
          await HousingOwners().insert(
            housings.flatMap((housing) =>
              formatHousingOwnersApi(housing, [housing.owner])
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

      it('should filter by locality kind', async () => {
        const localities: LocalityApi[] = [
          { ...genLocalityApi(), kind: 'ACV' },
          { ...genLocalityApi(), kind: 'PVD' }
        ];
        await Localities().insert(localities.map(formatLocalityApi));
        const housingList = new Array(10).fill('0').map(() => {
          const geoCode = oneOf(localities).geoCode;
          return genHousingApi(geoCode);
        });
        await Housing().insert(housingList.map(formatHousingRecordApi));

        const actual = await housingRepository.find({
          filters: {
            localityKinds: ['ACV', 'PVD']
          }
        });

        expect(actual).toSatisfyAll<HousingApi>((housing) =>
          localities
            .map((locality) => locality.geoCode)
            .includes(housing.geoCode)
        );
      });

      it('should filter by building vacancy rate', async () => {
        const buildingId = faker.string.uuid();
        const housingList: HousingApi[] = new Array(10)
          .fill('0')
          .map(() => genHousingApi())
          .map((housing, i, array) => ({
            ...housing,
            buildingId,
            // Create one vacant housing and nine others
            occupancy:
              i === array.length - 1
                ? OccupancyKindApi.Vacant
                : OccupancyKindApi.Rent
          }));
        await Housing().insert(housingList.map(formatHousingRecordApi));
        const building: BuildingApi = {
          ...genBuildingApi(housingList),
          id: buildingId
        };
        expect(building.vacantHousingCount).toBe(1);
        await Buildings().insert(formatBuildingApi(building));

        const actual = await housingRepository.find({
          filters: {
            vacancyRates: ['lt20']
          }
        });

        const buildingIds = fp.uniq(
          actual.map((housing) => housing.buildingId)
        );
        await async.forEach(buildingIds, async (id) => {
          const building = await Buildings().where('id', id).first();
          expect(building).toBeDefined();
          if (building) {
            expect(
              building.vacant_housing_count / building.housing_count
            ).toSatisfy((rate) => rate <= 0.2);
          }
        });
      });

      it('should query by an owner’s name', async () => {
        const housingList = new Array(10).fill('0').map(() => genHousingApi());
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
        geoCode: housing.geoCode,
        id: housing.id
      });

      expect(actual).toHaveProperty('id', housing.id);
    });

    it('should find by local id', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
        localId: housing.localId
      });

      expect(actual).toHaveProperty('id', housing.id);
    });

    it('should not include owner by default', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
        id: housing.id
      });

      expect(actual).toHaveProperty('owner', undefined);
    });

    it('should include owner on demand', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
        id: housing.id,
        includes: ['owner']
      });

      expect(actual).toHaveProperty('owner');
      expect(actual?.owner).toHaveProperty('id', owner.id);
    });

    it('should include the BAN address', async () => {
      const actual = await housingRepository.findOne({
        geoCode: housing.geoCode,
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
        latitude: address.latitude,
        longitude: address.longitude,
        score: address.score,
        lastUpdatedAt: expect.any(String)
      });
    });
  });

  describe('stream', () => {
    const houses: HousingApi[] = Array.from({ length: 5 }).map(() =>
      genHousingApi(oneOf(establishment.geoCodes))
    );

    beforeAll(async () => {
      await Housing().insert(houses.map(formatHousingRecordApi));
    });

    it('should stream a list of housing', async () => {
      const actual = await housingRepository
        .stream({
          filters: {
            establishmentIds: [establishment.id]
          },
          includes: ['owner']
        })
        .collect()
        .toPromise(Promise);

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
        occupancy: OccupancyKindApi.Rent,
        occupancyIntended: OccupancyKindApi.CommercialOrOffice
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
        occupancy: OccupancyKindApi.Vacant,
        occupancyIntended: OccupancyKindApi.Rent
      };
      await Housing().insert(formatHousingRecordApi(original));
      const update: HousingApi = {
        ...original,
        occupancy: OccupancyKindApi.Rent,
        occupancyIntended: OccupancyKindApi.CommercialOrOffice
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
