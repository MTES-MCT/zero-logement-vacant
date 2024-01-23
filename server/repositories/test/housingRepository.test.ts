import { faker } from '@faker-js/faker/locale/fr';

import housingRepository, {
  formatHousingRecordApi,
  Housing,
  ReferenceDataYear,
} from '../housingRepository';
import {
  Establishment1,
  Establishment2,
} from '../../../database/seeds/test/001-establishments';
import { Housing1 } from '../../../database/seeds/test/005-housing';
import {
  genBuildingApi,
  genCampaignApi,
  genGroupApi,
  genHousingApi,
  genLocalityApi,
  genOwnerApi,
  oneOf,
} from '../../test/testFixtures';
import { User1 } from '../../../database/seeds/test/003-users';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing,
} from '../groupRepository';
import fp from 'lodash/fp';
import { formatOwnerApi, Owners } from '../ownerRepository';
import {
  formatHousingOwnersApi,
  formatOwnerHousingApi,
  HousingOwners,
} from '../housingOwnerRepository';
import { HousingApi, OccupancyKindApi } from '../../models/HousingApi';
import { isDefined } from '../../../shared';
import { Owner1 } from '../../../database/seeds/test/004-owner';
import { differenceInYears } from 'date-fns';
import { formatLocalityApi, Localities } from '../localityRepository';
import { LocalityApi } from '../../models/LocalityApi';
import { BuildingApi } from '../../models/BuildingApi';
import {
  BuildingDBO,
  Buildings,
  formatBuildingApi,
  parseBuildingApi,
} from '../buildingRepository';
import async from 'async';
import { OwnerApi } from '../../models/OwnerApi';
import { formatElapsed, timer } from '../../../scripts/shared/elapsed';
import { logger } from '../../utils/logger';
import {
  CampaignsHousing,
  formatCampaignHousingApi,
} from '../campaignHousingRepository';
import { Campaigns, formatCampaignApi } from '../campaignRepository';

describe('Housing repository', () => {
  describe('find', () => {
    it('should sort by geo code and id by default', async () => {
      const actual = await housingRepository.find({
        filters: {},
      });

      expect(actual).toBeSortedBy('geoCode');
    });

    it('should include owner on demand', async () => {
      const actual = await housingRepository.find({
        filters: {},
        includes: ['owner'],
      });

      expect(actual).toSatisfyAll((housing) => housing.owner !== undefined);
    });

    it('should include owner if needed by a filter', async () => {
      const owner = Owner1;

      const actual = await housingRepository.find({
        filters: {
          ownerIds: [owner.id],
        },
      });

      expect(actual).toSatisfyAll<HousingApi>(
        (housing) => housing.owner?.id === owner.id
      );
    });

    it('should include owner only once', async () => {
      const owner = Owner1;

      const actual = await housingRepository.find({
        filters: {
          ownerIds: [owner.id],
        },
        includes: ['owner'],
      });

      expect(actual).toSatisfyAll<HousingApi>(
        (housing) => housing.owner?.id === owner.id
      );
    });

    describe('Filters', () => {
      it('should filter by housing ids', async () => {
        const actual = await housingRepository.find({
          filters: {
            establishmentIds: [Establishment1.id],
            housingIds: [Housing1.id],
          },
        });

        expect(actual).toBeArrayOfSize(1);
        expect(actual[0]).toMatchObject({
          id: Housing1.id,
          geoCode: Housing1.geoCode,
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
            { ...genHousingApi(), livingArea: 100 },
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
            predicate: (housing: HousingApi) => housing.livingArea < 35,
          },
          {
            name: 'between 35 and 74 m2',
            filter: ['35to74'],
            predicate: (housing: HousingApi) =>
              35 <= housing.livingArea && housing.livingArea <= 74,
          },
          {
            name: 'between 75 and 99 m2',
            filter: ['75to99'],
            predicate: (housing: HousingApi) =>
              75 <= housing.livingArea && housing.livingArea <= 99,
          },
          {
            name: 'more than 100 m2',
            filter: ['gte100'],
            predicate: (housing: HousingApi) => housing.livingArea >= 100,
          },
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              housingAreas: filter,
            },
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
              vacancyStartYear: ReferenceDataYear - i,
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
              ReferenceDataYear - (housing.vacancyStartYear as number) < 2,
          },
          {
            name: '2 years',
            filter: ['2'],
            predicate: (housing: HousingApi) =>
              ReferenceDataYear - (housing.vacancyStartYear as number) === 2,
          },
          {
            name: 'more than 2 years',
            filter: ['gt2'],
            predicate: (housing: HousingApi) =>
              ReferenceDataYear - (housing.vacancyStartYear as number) > 2,
          },
          {
            name: 'between 3 and 4 years',
            filter: ['3to4'],
            predicate: (housing: HousingApi) => {
              const diff =
                ReferenceDataYear - (housing.vacancyStartYear as number);
              return 3 <= diff && diff <= 4;
            },
          },
          {
            name: 'between 5 and 9 years',
            filter: ['5to9'],
            predicate: (housing: HousingApi) => {
              const diff =
                ReferenceDataYear - (housing.vacancyStartYear as number);
              return 5 <= diff && diff <= 9;
            },
          },
          {
            name: '10 years and more',
            filter: ['gte10'],
            predicate: (housing: HousingApi) =>
              ReferenceDataYear - (housing.vacancyStartYear as number) >= 10,
          },
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              vacancyDurations: filter,
            },
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
            createHousingByBuilding(50),
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
            },
          },
          {
            name: 'between 5 and 19',
            filter: ['5to19'],
            predicate: (building: BuildingApi) => {
              return 5 <= building.housingCount && building.housingCount <= 19;
            },
          },
          {
            name: 'between 20 and 49',
            filter: ['20to49'],
            predicate: (building: BuildingApi) => {
              return 20 <= building.housingCount && building.housingCount <= 49;
            },
          },
          {
            name: '50 and more',
            filter: ['gte50'],
            predicate: (building: BuildingApi) => {
              return building.housingCount >= 50;
            },
          },
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              housingCounts: filter,
            },
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
              i < vacant ? OccupancyKindApi.Vacant : OccupancyKindApi.Rent,
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
            createHousingByBuilding(8, 2), // 80 %
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
            },
          },
          {
            name: 'between 20 and 39 %',
            filter: ['20to39'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.2 <= rate && rate <= 0.39;
            },
          },
          {
            name: 'between 40 and 59 %',
            filter: ['40to59'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.4 <= rate && rate <= 0.59;
            },
          },
          {
            name: 'between 60 and 79 %',
            filter: ['60to79'],
            predicate: (building: BuildingApi) => {
              const rate = building.vacantHousingCount / building.housingCount;
              return 0.6 <= rate && rate <= 0.79;
            },
          },
          {
            name: '80 % and more',
            filter: ['gte80'],
            predicate: (building: BuildingApi) => {
              return building.vacantHousingCount / building.housingCount >= 0.8;
            },
          },
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              vacancyRates: filter,
            },
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
            birthDate: faker.date.birthdate({
              min: age,
              max: age,
              mode: 'age',
            }),
          };
        }

        beforeEach(async () => {
          const owners: OwnerApi[] = [
            createOwner(39),
            createOwner(40),
            createOwner(59),
            createOwner(60),
            createOwner(74),
            createOwner(75),
            createOwner(99),
            createOwner(100),
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
                differenceInYears(new Date(), owner.birthDate as Date) < 40
              );
            },
          },
          {
            name: 'between 40 and 59 years old',
            filter: ['40to59'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as Date
              );
              return 40 <= diff && diff <= 59;
            },
          },
          {
            name: 'between 60 and 74 years old',
            filter: ['60to74'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as Date
              );
              return 60 <= diff && diff <= 74;
            },
          },
          {
            name: 'between 75 and 99 years old',
            filter: ['75to99'],
            predicate: (owner: OwnerApi) => {
              const diff = differenceInYears(
                new Date(),
                owner.birthDate as Date
              );
              return 75 <= diff && diff <= 99;
            },
          },
          {
            name: '100 years old and more',
            filter: ['gte100'],
            predicate: (owner: OwnerApi) => {
              return (
                differenceInYears(new Date(), owner.birthDate as Date) >= 100
              );
            },
          },
        ];

        test.each(tests)('should keep $name', async ({ filter, predicate }) => {
          const actual = await housingRepository.find({
            filters: {
              ownerAges: filter,
            },
            includes: ['owner'],
          });

          expect(actual.length).toBeGreaterThan(0);
          expect(actual).toSatisfyAll<HousingApi>(
            (housing) => !!housing.owner && predicate(housing.owner)
          );
        });
      });

      it('should filter by establishment', async () => {
        const establishment = Establishment2;
        const housing = genHousingApi(oneOf(establishment.geoCodes));
        await Housing().insert(formatHousingRecordApi(housing));
        await Owners().insert(formatOwnerApi(housing.owner));
        await HousingOwners().insert(
          formatHousingOwnersApi(housing, [housing.owner])
        );

        const actual = await housingRepository.find({
          filters: {
            establishmentIds: [establishment.id],
          },
        });

        expect(actual).toSatisfyAll<HousingApi>((housing) =>
          establishment.geoCodes.some((geoCode) => geoCode === housing.geoCode)
        );
      });

      it('should filter by owner ids', async () => {
        const housingList = new Array(10).fill('0').map(() => genHousingApi());
        await Housing().insert(housingList.map(formatHousingRecordApi));
        const owner = genOwnerApi();
        await Owners().insert(formatOwnerApi(owner));
        await HousingOwners().insert(
          housingList.flatMap((housing) =>
            formatHousingOwnersApi(housing, [owner])
          )
        );

        const actual = await housingRepository.find({
          filters: {
            ownerIds: [owner.id],
          },
        });

        expect(actual).toBeArrayOfSize(housingList.length);
        expect(actual).toSatisfyAll<HousingApi>((housing) => {
          return owner.id === housing.owner?.id;
        });
      });

      it('should filter by owner kind', async () => {
        const housingList = new Array(10).fill('0').map(() => genHousingApi());
        await Housing().insert(housingList.map(formatHousingRecordApi));
        const owners = housingList.map((housing) => housing.owner);
        await Owners().insert(owners.map(formatOwnerApi));
        await HousingOwners().insert(
          housingList.flatMap((housing) =>
            formatHousingOwnersApi(housing, [housing.owner])
          )
        );

        const actual = await housingRepository.find({
          filters: {
            ownerAges: ['lt40'],
          },
        });

        expect(actual).toSatisfyAll<HousingApi>((housing) => {
          return (
            !!housing.owner?.birthDate &&
            differenceInYears(new Date(), new Date(housing.owner?.birthDate)) <
              40
          );
        });
      });

      it('should filter by multi owners', async () => {
        const housingList = new Array(10).fill('0').map(() => genHousingApi());
        await Housing().insert(housingList.map(formatHousingRecordApi));
        const owner = genOwnerApi();
        await Owners().insert(formatOwnerApi(owner));
        await HousingOwners().insert(
          housingList.flatMap((housing) =>
            formatHousingOwnersApi(housing, [owner])
          )
        );

        const actual = await housingRepository.find({
          filters: {
            multiOwners: ['true'],
          },
        });

        const countOwners = fp.pipe(
          fp.map((housing: HousingApi) => housing.owner),
          fp.groupBy('id'),
          fp.mapValues(fp.size),
          fp.values,
          fp.every((occurence) => occurence > 1)
        );
        expect(actual).toSatisfy<HousingApi[]>(countOwners);
      });

      it('should filter by locality kind', async () => {
        const localities: LocalityApi[] = [
          { ...genLocalityApi(), kind: 'ACV' },
          { ...genLocalityApi(), kind: 'PVD' },
        ];
        await Localities().insert(localities.map(formatLocalityApi));
        const housingList = new Array(10).fill('0').map(() => {
          const geoCode = oneOf(localities).geoCode;
          return genHousingApi(geoCode);
        });
        await Housing().insert(housingList.map(formatHousingRecordApi));

        const actual = await housingRepository.find({
          filters: {
            localityKinds: ['ACV', 'PVD'],
          },
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
                : OccupancyKindApi.Rent,
          }));
        await Housing().insert(housingList.map(formatHousingRecordApi));
        const building: BuildingApi = {
          ...genBuildingApi(housingList),
          id: buildingId,
        };
        expect(building.vacantHousingCount).toBe(1);
        await Buildings().insert(formatBuildingApi(building));

        const actual = await housingRepository.find({
          filters: {
            vacancyRates: ['5to20'],
          },
        });

        const buildingIds = fp.uniq(
          actual.map((housing) => housing.buildingId)
        );
        await async.forEach(buildingIds, async (id) => {
          const building: BuildingDBO = await Buildings()
            .where('id', id)
            .first();
          expect(building).toBeDefined();
          expect(
            building.vacant_housing_count / building.housing_count
          ).toSatisfy((rate) => 0.05 <= rate && rate <= 0.2);
        });
      });

      it('should query by an owner’s name', async () => {
        const housingList = new Array(10).fill('0').map(() => genHousingApi());
        await Housing().insert(housingList.map(formatHousingRecordApi));
        const owner: OwnerApi = {
          ...genOwnerApi(),
          fullName: 'Jean Dupont',
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
            query,
          },
        });

        expect(actual).toSatisfyAll<HousingApi>(
          (housing) => housing.owner?.fullName?.includes(query) ?? false
        );
      });

      it('should filter by group', async () => {
        const group = genGroupApi(User1, Establishment1);
        const housingList = [
          genHousingApi(oneOf(Establishment1.geoCodes)),
          genHousingApi(oneOf(Establishment1.geoCodes)),
          genHousingApi(oneOf(Establishment1.geoCodes)),
        ];
        const owners = housingList
          .map((housing) => housing.owner)
          .filter(isDefined);
        await Housing().insert(housingList.map(formatHousingRecordApi));
        await Owners().insert(owners.map(formatOwnerApi));
        await HousingOwners().insert(housingList.map(formatOwnerHousingApi));
        await Groups().insert(formatGroupApi(group));
        await GroupsHousing().insert(formatGroupHousingApi(group, housingList));

        const actual = await housingRepository.find({
          filters: {
            establishmentIds: [Establishment1.id],
            groupIds: [group.id],
          },
        });

        expect(actual).toBeArrayOfSize(3);
        const ids = housingList.map(fp.pick(['id']));
        expect(actual).toIncludeAllPartialMembers(ids);
      });
    });
  });

  describe('count', () => {
    describe('Benchmark', () => {
      beforeEach(async () => {
        await Housing().delete();
      });

      it('should process a large amount of data', async () => {
        const amount = 100_000;
        const maxParallel = 10;

        const housingList = new Array(amount)
          .fill('0')
          .map(() => genHousingApi());
        await async.forEachLimit(
          fp.chunk(1_000, housingList),
          maxParallel,
          async (chunk) => {
            await Housing().insert(chunk.map(formatHousingRecordApi));
            logger.debug(`Saved ${chunk.length} housing.`);
          }
        );
        logger.info(`Saved ${amount} housing.`);

        await new Promise<void>((resolve) => {
          const stop = timer();
          return housingRepository
            .count({
              occupancies: [OccupancyKindApi.Vacant],
              status: 0,
            })
            .then(() => {
              const elapsed = stop();
              logger.info(`Elapsed: ${formatElapsed(elapsed)}.`);
              resolve();
            });
        });
      }, 120_000 /* A specific timeout */);
    });
  });

  describe('findOne', () => {
    it('should find by id', async () => {
      const actual = await housingRepository.findOne({
        geoCode: Housing1.geoCode,
        id: Housing1.id,
      });

      expect(actual).toHaveProperty('id', Housing1.id);
    });

    it('should find by local id', async () => {
      const actual = await housingRepository.findOne({
        geoCode: Housing1.geoCode,
        localId: Housing1.localId,
      });

      expect(actual).toHaveProperty('id', Housing1.id);
    });

    it('should not include owner by default', async () => {
      const actual = await housingRepository.findOne({
        geoCode: Housing1.geoCode,
        id: Housing1.id,
      });

      expect(actual).toHaveProperty('owner', undefined);
    });

    it('should include owner on demand', async () => {
      const actual = await housingRepository.findOne({
        geoCode: Housing1.geoCode,
        id: Housing1.id,
        includes: ['owner'],
      });

      expect(actual).toHaveProperty('owner');
      expect(actual?.owner).toHaveProperty('id', Owner1.id);
    });
  });

  describe('stream', () => {
    it('should stream a list of housing', (done) => {
      const establishment = Establishment1;
      housingRepository
        .stream({
          filters: {
            establishmentIds: [establishment.id],
          },
          includes: ['owner'],
        })
        .each((housing) => {
          expect(establishment.geoCodes).toContain(housing.geoCode);
        })
        .done(done);
    });
  });

  describe('save', () => {
    it('should create a housing if it does not exist', async () => {
      const housing = genHousingApi(oneOf(Establishment1.geoCodes));

      await housingRepository.save(housing);

      const actual = await Housing().where('id', housing.id).first();
      expect(actual).toBeDefined();
    });

    it('should update all fields of an existing housing', async () => {
      const original = genHousingApi(oneOf(Establishment1.geoCodes));
      await Housing().insert(formatHousingRecordApi(original));
      const update: HousingApi = {
        ...original,
        occupancy: OccupancyKindApi.Rent,
        occupancyIntended: OccupancyKindApi.CommercialOrOffice,
      };

      await housingRepository.save(update, { onConflict: 'merge' });

      const actual = await Housing().where('id', original.id).first();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        occupancy_intended: update.occupancyIntended,
      });
    });

    it('should update specific fields of an existing housing', async () => {
      const original: HousingApi = {
        ...genHousingApi(oneOf(Establishment1.geoCodes)),
        occupancy: OccupancyKindApi.Vacant,
        occupancyIntended: OccupancyKindApi.Rent,
      };
      await Housing().insert(formatHousingRecordApi(original));
      const update: HousingApi = {
        ...original,
        occupancy: OccupancyKindApi.Rent,
        occupancyIntended: OccupancyKindApi.CommercialOrOffice,
      };

      await housingRepository.save(update, {
        onConflict: 'merge',
        merge: ['occupancy'],
      });

      const actual = await Housing().where('id', original.id).first();
      expect(actual).toBeDefined();
      expect(actual).toMatchObject({
        occupancy: update.occupancy,
        occupancy_intended: original.occupancyIntended,
      });
    });
  });

  describe('remove', () => {
    it('should remove the links with a campaign in cascade', async () => {
      const housing = genHousingApi();
      await Housing().insert(formatHousingRecordApi(housing));
      const campaign = genCampaignApi(Establishment1.id, User1.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsHousing().insert(
        formatCampaignHousingApi(campaign, [housing])
      );

      await housingRepository.remove(housing);

      const actual = await CampaignsHousing().where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
      });
      expect(actual).toBeArrayOfSize(0);
    });
  });
});
