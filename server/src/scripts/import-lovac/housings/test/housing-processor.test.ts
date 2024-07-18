import { ReadableStream } from 'node:stream/web';

import {
  formatHousingRecordApi,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import { genHousingApi } from '~/test/testFixtures';
import {
  createHousingProcessor,
  isCompleted,
  isInProgress
} from '~/scripts/import-lovac/housings/housing-processor';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { OccupancyKindApi } from '~/models/HousingApi';
import {
  HOUSING_STATUS_VALUES,
  HousingStatusApi
} from '~/models/HousingStatusApi';

describe('Housing processor', () => {
  describe('If the housing is present in LOVAC 2024', () => {
    const dataFileYears = ['lovac-2023', 'lovac-2024'];

    it('should skip it', async () => {
      const stream = new ReadableStream<HousingRecordDBO>({
        pull(controller) {
          const housing = formatHousingRecordApi({
            ...genHousingApi(),
            dataFileYears
          });
          controller.enqueue(housing);
          controller.close();
        }
      });
      const housingRepository = {
        update: jest.fn()
      };
      const processor = createHousingProcessor({
        reporter: createNoopReporter(),
        housingRepository
      });

      await stream.pipeTo(processor);

      expect(housingRepository.update).toHaveBeenCalledTimes(0);
    });
  });

  describe('Otherwise the housing is missing from LOVAC 2024', () => {
    const dataFileYears = ['lovac-2023'];

    describe('if it is vacant', () => {
      const occupancy = OccupancyKindApi.Vacant;

      describe('if it is currently monitored', () => {
        const status = HousingStatusApi.InProgress;
        const subStatuses = ['En accompagnement', 'Intervention publique'];

        it.each(subStatuses)('should remain untouched', (subStatus) => {
          const stream = new ReadableStream<HousingRecordDBO>({
            pull(controller) {
              const housing = formatHousingRecordApi({
                ...genHousingApi(),
                dataFileYears,
                occupancy,
                status,
                subStatus
              });
              controller.enqueue(housing);
              controller.close();
            }
          });
          const housingRepository = {
            update: jest.fn()
          };
          const processor = createHousingProcessor({
            reporter: createNoopReporter(),
            housingRepository
          });

          stream.pipeTo(processor);

          expect(housingRepository.update).toHaveBeenCalledTimes(0);
        });
      });

      describe('if it was set as completed', () => {
        const status = HousingStatusApi.Completed;

        it('should remain untouched', () => {
          const stream = new ReadableStream<HousingRecordDBO>({
            pull(controller) {
              const housing = formatHousingRecordApi({
                ...genHousingApi(),
                dataFileYears,
                occupancy,
                status
              });
              controller.enqueue(housing);
              controller.close();
            }
          });
          const housingRepository = {
            update: jest.fn()
          };
          const processor = createHousingProcessor({
            reporter: createNoopReporter(),
            housingRepository
          });

          stream.pipeTo(processor);

          expect(housingRepository.update).toHaveBeenCalledTimes(0);
        });
      });

      const statuses = HOUSING_STATUS_VALUES.filter(
        (status) => status !== HousingStatusApi.Completed
      ).filter((status) => status !== HousingStatusApi.InProgress);

      it.each(statuses)(
        'should be set as non-vacant otherwise',
        async (status) => {
          const housing = formatHousingRecordApi({
            ...genHousingApi(),
            dataFileYears,
            occupancy,
            status
          });
          const stream = new ReadableStream<HousingRecordDBO>({
            pull(controller) {
              controller.enqueue(housing);
              controller.close();
            }
          });
          const housingRepository = {
            update: jest.fn().mockImplementation(() => Promise.resolve())
          };
          const processor = createHousingProcessor({
            reporter: createNoopReporter(),
            housingRepository
          });

          await stream.pipeTo(processor);

          expect(housingRepository.update).toHaveBeenCalledOnce();
          expect(housingRepository.update).toHaveBeenCalledWith(
            { id: housing.id, geoCode: housing.geo_code },
            expect.objectContaining({
              occupancy: OccupancyKindApi.Unknown,
              status: HousingStatusApi.Completed,
              subStatus: 'Sortie de la vacance'
            })
          );
        }
      );

      // TODO: test events
    });

    describe('if the monitoring is in progress or completed', () => {
      it('should create a conflict', () => {
        // TODO
      });
    });
  });

  describe('isInProgress', () => {
    describe(`If the status is ${HousingStatusApi.InProgress}`, () => {
      const status = HousingStatusApi.InProgress;

      it.each(['En accompagnement', 'Intervention publique'])(
        'should return true if the housing status is %s and the substatus is %s',
        (subStatus) => {
          const housing = formatHousingRecordApi({
            ...genHousingApi(),
            status,
            subStatus
          });

          const actual = isInProgress(housing);

          expect(actual).toBeTrue();
        }
      );
    });

    it('should return false if the substatus is not set', () => {
      const housing = formatHousingRecordApi({
        ...genHousingApi(),
        status: HousingStatusApi.InProgress,
        subStatus: undefined
      });

      const actual = isInProgress(housing);

      expect(actual).toBeFalse();
    });

    it('should return false if the substatus is irrelevant', () => {
      const housing = formatHousingRecordApi({
        ...genHousingApi(),
        status: HousingStatusApi.InProgress,
        subStatus: 'anything else'
      });

      const actual = isInProgress(housing);

      expect(actual).toBeFalse();
    });

    const otherStatuses = HOUSING_STATUS_VALUES.filter(
      (status) => status !== HousingStatusApi.InProgress
    );

    it.each(otherStatuses)(
      'should return false for other statuses',
      (status) => {
        const housing = formatHousingRecordApi({
          ...genHousingApi(),
          status
        });

        const actual = isInProgress(housing);

        expect(actual).toBeFalse();
      }
    );
  });

  describe('isCompleted', () => {
    it(`should return true if the housing status is ${HousingStatusApi.Completed}`, () => {
      const housing = formatHousingRecordApi({
        ...genHousingApi(),
        status: HousingStatusApi.Completed
      });

      const actual = isCompleted(housing);

      expect(actual).toBeTrue();
    });

    const otherStatuses = HOUSING_STATUS_VALUES.filter(
      (status) => status !== HousingStatusApi.Completed
    );

    it.each(otherStatuses)('should return false otherwise', (status) => {
      const housing = formatHousingRecordApi({
        ...genHousingApi(),
        status
      });

      const actual = isCompleted(housing);

      expect(actual).toBeFalse();
    });
  });
});
