import housingRepository, {
  formatHousingRecordApi,
  Housing,
} from '../housingRepository';
import {
  Establishment1,
  Establishment2,
} from '../../../database/seeds/test/001-establishments';
import { Housing1 } from '../../../database/seeds/test/005-housing';
import { genGroupApi, genHousingApi, oneOf } from '../../test/testFixtures';
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
import async from 'async';
import { startTimer } from '../../../scripts/shared/elapsed';
import { logger } from '../../utils/logger';

describe('Housing repository', () => {
  describe('find', () => {
    it('should sort by geo code and id by default', async () => {
      const actual = await housingRepository.find({
        filters: {},
      });

      expect(actual).toBeSortedBy('geoCode');
      expect(actual).toBeSortedBy('id');
    });

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

    it('should include owner on demand', async () => {
      const actual = await housingRepository.find({
        filters: {},
        includes: ['owner'],
      });

      expect(actual).toSatisfyAll((housing) => housing.owner !== undefined);
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
