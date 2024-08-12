import { ReadableStream } from 'node:stream/web';
import { genHousingApi, genUserApi } from '~/test/testFixtures';
import {
  createHousingProcessor,
  isCompleted,
  isInProgress,
  ProcessorOptions
} from '~/scripts/import-lovac/housings/housing-processor';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { HousingApi, OccupancyKindApi } from '~/models/HousingApi';
import {
  HOUSING_STATUS_VALUES,
  HousingStatusApi
} from '~/models/HousingStatusApi';
import { HousingEventApi } from '~/models/EventApi';

describe('Housing processor', () => {
  let auth: ProcessorOptions['auth'];
  let housing: HousingApi;
  let housingRepository: jest.MockedObject<
    ProcessorOptions['housingRepository']
  >;
  let housingEventRepository: jest.MockedObject<
    ProcessorOptions['housingEventRepository']
  >;

  beforeEach(() => {
    auth = genUserApi('');
    housing = genHousingApi();
    housingRepository = {
      update: jest.fn().mockImplementation(() => Promise.resolve())
    };
    housingEventRepository = {
      insert: jest.fn().mockImplementation(() => Promise.resolve())
    };
  });

  describe('If the housing is present in LOVAC 2024', () => {
    beforeEach(() => {
      housing.dataFileYears = ['lovac-2023', 'lovac-2024'];
    });

    it('should skip it', async () => {
      const stream = new ReadableStream<HousingApi>({
        pull(controller) {
          controller.enqueue(housing);
          controller.close();
        }
      });
      const processor = createHousingProcessor({
        auth,
        reporter: createNoopReporter(),
        housingRepository,
        housingEventRepository
      });

      await stream.pipeTo(processor);

      expect(housingRepository.update).toHaveBeenCalledTimes(0);
    });
  });

  describe('Otherwise the housing is missing from LOVAC 2024', () => {
    beforeEach(() => {
      housing.dataFileYears = ['lovac-2023'];
    });

    describe('if it is vacant', () => {
      beforeEach(() => {
        housing.occupancy = OccupancyKindApi.Vacant;
      });

      describe('if it is currently monitored', () => {
        beforeEach(() => {
          housing.status = HousingStatusApi.InProgress;
        });

        const subStatuses = ['En accompagnement', 'Intervention publique'];

        it.each(subStatuses)('should remain untouched', (subStatus) => {
          const stream = new ReadableStream<HousingApi>({
            pull(controller) {
              controller.enqueue({
                ...housing,
                subStatus
              });
              controller.close();
            }
          });
          const processor = createHousingProcessor({
            auth,
            reporter: createNoopReporter(),
            housingRepository,
            housingEventRepository
          });

          stream.pipeTo(processor);

          expect(housingRepository.update).toHaveBeenCalledTimes(0);
        });
      });

      describe('if it was set as completed', () => {
        beforeEach(() => {
          housing.status = HousingStatusApi.Completed;
        });

        it('should remain untouched', () => {
          const stream = new ReadableStream<HousingApi>({
            pull(controller) {
              controller.enqueue(housing);
              controller.close();
            }
          });
          const processor = createHousingProcessor({
            auth,
            reporter: createNoopReporter(),
            housingRepository,
            housingEventRepository
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
          const stream = new ReadableStream<HousingApi>({
            pull(controller) {
              controller.enqueue({
                ...housing,
                status
              });
              controller.close();
            }
          });
          const processor = createHousingProcessor({
            auth,
            reporter: createNoopReporter(),
            housingRepository,
            housingEventRepository
          });

          await stream.pipeTo(processor);

          expect(housingRepository.update).toHaveBeenCalledOnce();
          expect(housingRepository.update).toHaveBeenCalledWith(
            { id: housing.id, geoCode: housing.geoCode },
            expect.objectContaining({
              occupancy: OccupancyKindApi.Unknown,
              status: HousingStatusApi.Completed,
              subStatus: 'Sortie de la vacance'
            })
          );
        }
      );

      it('should create an event "Changement de statut d’occupation"', async () => {
        const stream = new ReadableStream<HousingApi>({
          pull(controller) {
            controller.enqueue(housing);
            controller.close();
          }
        });
        const processor = createHousingProcessor({
          auth,
          reporter: createNoopReporter(),
          housingRepository,
          housingEventRepository
        });

        await stream.pipeTo(processor);

        expect(housingEventRepository.insert).toHaveBeenCalled();
        expect(housingEventRepository.insert).toHaveBeenCalledWith<
          [HousingEventApi]
        >(
          expect.objectContaining<HousingEventApi>({
            id: expect.any(String),
            name: 'Changement de statut d’occupation',
            kind: 'Update',
            category: 'Followup',
            section: 'Situation',
            conflict: false,
            old: housing,
            new: { ...housing, occupancy: OccupancyKindApi.Unknown },
            createdAt: expect.any(Date),
            createdBy: expect.any(String),
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
        );
      });

      it('should create an event "Changement de statut de suivi"', async () => {
        const stream = new ReadableStream<HousingApi>({
          pull(controller) {
            controller.enqueue(housing);
            controller.close();
          }
        });
        const processor = createHousingProcessor({
          auth,
          reporter: createNoopReporter(),
          housingRepository,
          housingEventRepository
        });

        await stream.pipeTo(processor);

        expect(housingEventRepository.insert).toHaveBeenCalled();
        expect(housingEventRepository.insert).toHaveBeenCalledWith<
          [HousingEventApi]
        >(
          expect.objectContaining<HousingEventApi>({
            id: expect.any(String),
            name: 'Changement de statut de suivi',
            kind: 'Update',
            category: 'Followup',
            section: 'Situation',
            conflict: false,
            old: { ...housing, occupancy: OccupancyKindApi.Unknown },
            new: {
              ...housing,
              occupancy: OccupancyKindApi.Unknown,
              status: HousingStatusApi.Completed,
              subStatus: 'Sortie de la vacance'
            },
            createdAt: expect.any(Date),
            createdBy: expect.any(String),
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
        );
      });
    });
  });

  describe('isInProgress', () => {
    describe(`If the status is ${HousingStatusApi.InProgress}`, () => {
      const status = HousingStatusApi.InProgress;

      it.each(['En accompagnement', 'Intervention publique'])(
        'should return true if the housing status is %s and the substatus is %s',
        (subStatus) => {
          const housing = {
            ...genHousingApi(),
            status,
            subStatus
          };

          const actual = isInProgress(housing);

          expect(actual).toBeTrue();
        }
      );
    });

    it('should return false if the substatus is not set', () => {
      const housing = {
        ...genHousingApi(),
        status: HousingStatusApi.InProgress,
        subStatus: undefined
      };

      const actual = isInProgress(housing);

      expect(actual).toBeFalse();
    });

    it('should return false if the substatus is irrelevant', () => {
      const housing = {
        ...genHousingApi(),
        status: HousingStatusApi.InProgress,
        subStatus: 'anything else'
      };

      const actual = isInProgress(housing);

      expect(actual).toBeFalse();
    });

    const otherStatuses = HOUSING_STATUS_VALUES.filter(
      (status) => status !== HousingStatusApi.InProgress
    );

    it.each(otherStatuses)(
      'should return false for other statuses',
      (status) => {
        const housing = {
          ...genHousingApi(),
          status
        };

        const actual = isInProgress(housing);

        expect(actual).toBeFalse();
      }
    );
  });

  describe('isCompleted', () => {
    it(`should return true if the housing status is ${HousingStatusApi.Completed}`, () => {
      const housing = {
        ...genHousingApi(),
        status: HousingStatusApi.Completed
      };

      const actual = isCompleted(housing);

      expect(actual).toBeTrue();
    });

    const otherStatuses = HOUSING_STATUS_VALUES.filter(
      (status) => status !== HousingStatusApi.Completed
    );

    it.each(otherStatuses)('should return false otherwise', (status) => {
      const housing = {
        ...genHousingApi(),
        status
      };

      const actual = isCompleted(housing);

      expect(actual).toBeFalse();
    });
  });
});
