import { Occupancy } from '@zerologementvacant/models';
import { flatten, toArray } from '@zerologementvacant/utils/node';
import { ReadableStream } from 'node:stream/web';
import { HousingApi } from '~/models/HousingApi';
import {
  HOUSING_STATUS_VALUES,
  HousingStatusApi
} from '~/models/HousingStatusApi';
import {
  createHousingProcessor,
  HousingChange,
  HousingChanges,
  HousingEventChange,
  isCompleted,
  isInProgress
} from '~/scripts/import-lovac/housings/housing-processor';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import {
  genEstablishmentApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

describe('Housing processor', () => {
  let housing: HousingApi;

  beforeEach(() => {
    housing = genHousingApi();
  });

  async function run(
    housing: HousingApi
  ): Promise<ReadonlyArray<HousingChanges>> {
    const establishment = genEstablishmentApi();
    const auth = genUserApi(establishment.id);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(housing);
        controller.close();
      }
    });
    const processor = createHousingProcessor({
      auth,
      reporter: createNoopReporter()
    });
    return toArray(stream.pipeThrough(processor).pipeThrough(flatten()));
  }

  describe('If the housing is present in LOVAC 2025', () => {
    beforeEach(() => {
      housing.dataFileYears = ['lovac-2023', 'lovac-2024', 'lovac-2025'];
    });

    it('should skip it', async () => {
      const actual = await run(housing);

      expect(actual).toHaveLength(0);
    });
  });

  describe('Otherwise the housing is missing from LOVAC 2025', () => {
    beforeEach(() => {
      housing.dataFileYears = ['lovac-2023'];
    });

    describe('if it is vacant', () => {
      beforeEach(() => {
        housing.occupancy = Occupancy.VACANT;
        housing.status = HousingStatusApi.NeverContacted;
        housing.subStatus = null;
      });

      describe('if it is currently monitored', () => {
        beforeEach(() => {
          housing.status = HousingStatusApi.InProgress;
        });

        const subStatuses = ['En accompagnement', 'Intervention publique'];

        it.each(subStatuses)('should remain untouched', async (subStatus) => {
          const actual = await run({ ...housing, subStatus });

          expect(actual).toHaveLength(0);
        });
      });

      describe('if it was set as completed', () => {
        beforeEach(() => {
          housing.status = HousingStatusApi.Completed;
        });

        it('should remain untouched', async () => {
          const actual = await run(housing);

          expect(actual).toHaveLength(0);
        });
      });

      const statuses = HOUSING_STATUS_VALUES.filter(
        (status) => status !== HousingStatusApi.Completed
      ).filter((status) => status !== HousingStatusApi.InProgress);

      it.each(statuses)(
        'should be set as non-vacant otherwise',
        async (status) => {
          const actual = await run({ ...housing, status });

          expect(actual).toPartiallyContain<HousingChange>({
            type: 'housing',
            kind: 'update',
            value: expect.objectContaining<Partial<HousingChange['value']>>({
              occupancy: Occupancy.UNKNOWN,
              status: HousingStatusApi.Completed,
              subStatus: 'Sortie de la vacance'
            })
          });
        }
      );

      it('should create an event "Changement de statut d’occupation"', async () => {
        const actual = await run(housing);

        expect(actual).toPartiallyContain<HousingEventChange>({
          type: 'event',
          kind: 'create',
          value: expect.objectContaining<Partial<HousingEventChange['value']>>({
            name: 'Changement de statut d’occupation',
            old: expect.objectContaining({ occupancy: housing.occupancy }),
            new: expect.objectContaining({ occupancy: Occupancy.UNKNOWN }),
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
        });
      });

      it('should create an event "Changement de statut de suivi"', async () => {
        const actual = await run(housing);

        expect(actual).toPartiallyContain<HousingEventChange>({
          type: 'event',
          kind: 'create',
          value: expect.objectContaining<Partial<HousingEventChange['value']>>({
            name: 'Changement de statut de suivi',
            old: expect.objectContaining<Partial<HousingApi>>({
              status: housing.status
            }),
            new: expect.objectContaining<Partial<HousingApi>>({
              status: HousingStatusApi.Completed,
              subStatus: 'Sortie de la vacance'
            }),
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
        });
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
