import { ReadableStream } from 'node:stream/web';

import { createSourceHousingProcessor } from '~/scripts/import-lovac/source-housings/source-housing-processor';
import { HousingApi, OccupancyKindApi } from '~/models/HousingApi';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingEventApi,
  genUserApi
} from '~/test/testFixtures';
import { HousingStatusApi } from '~/models/HousingStatusApi';

describe('Source housing processor', () => {
  describe('If the housing is missing from our database', () => {
    it('should insert a new housing', async () => {
      const findOne = jest.fn().mockResolvedValue(null);
      const insert = jest.fn().mockImplementation(() => Promise.resolve());
      const update = jest.fn().mockImplementation(() => Promise.resolve());
      const stream = new ReadableStream<SourceHousing>({
        pull(controller) {
          const housing: SourceHousing = genSourceHousing();
          controller.enqueue(housing);
          controller.close();
        }
      });
      const processor = createSourceHousingProcessor({
        reporter: createNoopReporter(),
        housingRepository: {
          findOne,
          insert,
          update
        },
        housingEventRepository: {
          find: jest.fn()
        }
      });

      await stream.pipeTo(processor);

      expect(insert).toHaveBeenCalledOnce();
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          dataFileYears: ['lovac-2024'],
          occupancy: OccupancyKindApi.Vacant,
          status: HousingStatusApi.NeverContacted
        })
      );
    });
  });

  describe('If the housing is present in our database', () => {
    describe('If the housing is not vacant', () => {
      const occupancy = OccupancyKindApi.Rent;

      describe('If the housing is not supervised', () => {
        const status = HousingStatusApi.Waiting;

        it('should set its occupancy as vacant', async () => {
          const sourceHousing: SourceHousing = genSourceHousing();
          const housing: HousingApi = {
            ...genHousingApi(sourceHousing.geo_code),
            occupancy,
            status
          };
          const housingRepository = {
            findOne: jest.fn().mockResolvedValue(housing),
            insert: jest.fn().mockImplementation(() => Promise.resolve()),
            update: jest.fn().mockImplementation(() => Promise.resolve())
          };
          const housingEventRepository = {
            find: jest.fn().mockImplementation(() => Promise.resolve())
          };
          const stream = new ReadableStream<SourceHousing>({
            pull(controller) {
              controller.enqueue(sourceHousing);
              controller.close();
            }
          });
          const processor = createSourceHousingProcessor({
            reporter: createNoopReporter(),
            housingRepository,
            housingEventRepository
          });

          await stream.pipeTo(processor);

          expect(housingRepository.update).toHaveBeenCalledOnce();
          expect(housingRepository.update).toHaveBeenCalledWith(
            { geoCode: housing.geoCode, id: housing.id },
            {
              dataFileYears: [...housing.dataFileYears, 'lovac-2024'],
              occupancy: OccupancyKindApi.Vacant
            }
          );
        });
      });

      describe('If the housing is supervised', () => {
        const status = HousingStatusApi.Completed;
        const subStatus = 'N’était pas vacant';
        const sourceHousing: SourceHousing = genSourceHousing();
        const housing: HousingApi = {
          ...genHousingApi(sourceHousing.geo_code),
          occupancy,
          status,
          subStatus
        };
        const establishment = genEstablishmentApi();
        const creator = genUserApi(establishment.id);
        const events = Array.from({ length: 3 }, () =>
          genHousingEventApi(housing, creator)
        );

        it('should append the source and year, but keep the rest as is', async () => {
          const housingRepository = {
            findOne: jest.fn().mockResolvedValue(housing),
            insert: jest.fn().mockImplementation(() => Promise.resolve()),
            update: jest.fn().mockImplementation(() => Promise.resolve())
          };
          const housingEventRepository = {
            find: jest.fn().mockResolvedValue(events)
          };
          const stream = new ReadableStream<SourceHousing>({
            pull(controller) {
              controller.enqueue(sourceHousing);
              controller.close();
            }
          });
          const processor = createSourceHousingProcessor({
            reporter: createNoopReporter(),
            housingRepository,
            housingEventRepository
          });

          await stream.pipeTo(processor);

          expect(housingRepository.update).toHaveBeenCalledOnce();
          expect(housingRepository.update).toHaveBeenCalledWith(
            { geoCode: housing.geoCode, id: housing.id },
            {
              dataFileYears: [...housing.dataFileYears, 'lovac-2024']
            }
          );
        });

        it.todo('should create events');
      });
    });

    describe('If the housing is vacant', () => {
      it('should append the source and year', async () => {
        const sourceHousing: SourceHousing = genSourceHousing();
        const housing: HousingApi = {
          ...genHousingApi(sourceHousing.geo_code),
          occupancy: OccupancyKindApi.Vacant
        };
        const housingRepository = {
          findOne: jest.fn().mockResolvedValue(housing),
          insert: jest.fn().mockImplementation(() => Promise.resolve()),
          update: jest.fn().mockImplementation(() => Promise.resolve())
        };
        const housingEventRepository = {
          find: jest.fn().mockImplementation(() => Promise.resolve())
        };
        const stream = new ReadableStream<SourceHousing>({
          pull(controller) {
            controller.enqueue(sourceHousing);
            controller.close();
          }
        });
        const processor = createSourceHousingProcessor({
          reporter: createNoopReporter(),
          housingRepository,
          housingEventRepository
        });

        await stream.pipeTo(processor);

        expect(housingRepository.update).toHaveBeenCalledOnce();
        expect(housingRepository.update).toHaveBeenCalledWith(
          { geoCode: housing.geoCode, id: housing.id },
          {
            dataFileYears: [...housing.dataFileYears, 'lovac-2024']
          }
        );
      });

      it.todo('should create an event');
    });
  });
});
