import { faker } from '@faker-js/faker/locale/fr';

import housingRepository, {
  formatHousingRecordApi,
  Housing,
} from '../housingRepository';
import {
  Establishment1,
  Establishment2,
} from '../../../database/seeds/test/001-establishments';
import { Housing1 } from '../../../database/seeds/test/005-housing';
import {
  genBuildingApi,
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
} from '../buildingRepository';
import async from 'async';
import { OwnerApi } from '../../models/OwnerApi';
import { startTimer } from '../../../scripts/shared/elapsed';
import { logger } from '../../utils/logger';

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
          startTimer(async (stopTimer) => {
            await housingRepository.count({
              occupancies: [OccupancyKindApi.Vacant],
              status: 0,
            });
            const elapsed = stopTimer();
            logger.info(`Elapsed: ${elapsed}.`);
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

  describe('get', () => {
    it('should return the housing if it exists', async () => {
      const actual = await housingRepository.get(
        Housing1.id,
        Establishment1.id
      );

      expect(actual).toBeDefined();
    });

    it('should return null otherwise', async () => {
      const actual = await housingRepository.get(
        Housing1.id,
        Establishment2.id
      );

      expect(actual).toBeNull();
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
});
