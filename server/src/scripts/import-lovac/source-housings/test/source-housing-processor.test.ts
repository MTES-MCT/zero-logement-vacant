import { ReadableStream, WritableStream } from 'node:stream/web';

import {
  createSourceHousingProcessor,
  ProcessorOptions
} from '~/scripts/import-lovac/source-housings/source-housing-processor';
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
import { HousingEventApi } from '~/models/EventApi';

describe('Source housing processor', () => {
  const establishment = genEstablishmentApi();
  const creator = genUserApi(establishment.id);
  let auth: ProcessorOptions['auth'];
  let banAddressRepository: jest.MockedObject<
    ProcessorOptions['banAddressRepository']
  >;
  let housingRepository: jest.MockedObject<
    ProcessorOptions['housingRepository']
  >;
  let housingEventRepository: jest.MockedObject<
    ProcessorOptions['housingEventRepository']
  >;

  beforeEach(() => {
    auth = genUserApi('');
    banAddressRepository = {
      insert: jest.fn().mockImplementation(() => Promise.resolve())
    };
    housingRepository = {
      findOne: jest.fn(),
      insert: jest.fn().mockImplementation(() => Promise.resolve()),
      update: jest.fn().mockImplementation(() => Promise.resolve())
    };
    housingEventRepository = {
      insertMany: jest.fn().mockImplementation(() => Promise.resolve()),
      find: jest.fn()
    };
  });

  describe('If the housing is missing from our database', () => {
    let sourceHousing: SourceHousing;

    beforeEach(async () => {
      sourceHousing = genSourceHousing();
      housingRepository.findOne.mockResolvedValue(null);
      housingEventRepository.find.mockResolvedValue([]);

      const stream = new ReadableStream<SourceHousing>({
        pull(controller) {
          controller.enqueue(sourceHousing);
          controller.close();
        }
      });
      const processor = createSourceHousingProcessor({
        auth,
        reporter: createNoopReporter(),
        banAddressRepository,
        housingRepository,
        housingEventRepository
      });

      await stream.pipeTo(processor);
    });

    it('should insert a new housing', () => {
      expect(housingRepository.insert).toHaveBeenCalledOnce();
      expect(housingRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          dataFileYears: ['lovac-2024'],
          occupancy: OccupancyKindApi.Vacant,
          status: HousingStatusApi.NeverContacted
        })
      );
    });

    it('should insert a new BAN address', () => {
      expect(banAddressRepository.insert).toHaveBeenCalledOnce();
      expect(banAddressRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          address: sourceHousing.ban_address,
          latitude: sourceHousing.ban_latitude,
          longitude: sourceHousing.ban_longitude,
          score: sourceHousing.ban_score
        })
      );
    });
  });

  describe('If the housing is present in our database', () => {
    let stream: ReadableStream<SourceHousing>;
    let processor: WritableStream<SourceHousing>;
    let sourceHousing: SourceHousing;
    let housing: HousingApi;
    let events: HousingEventApi[];

    beforeEach(() => {
      sourceHousing = genSourceHousing();
      housing = genHousingApi();
      events = [];
      housingRepository.findOne.mockResolvedValue(housing);
      housingEventRepository.find.mockResolvedValue(events);

      stream = new ReadableStream<SourceHousing>({
        pull(controller) {
          controller.enqueue(sourceHousing);
          controller.close();
        }
      });
      processor = createSourceHousingProcessor({
        auth,
        reporter: createNoopReporter(),
        banAddressRepository,
        housingRepository,
        housingEventRepository
      });
    });

    describe('If the housing is not vacant', () => {
      beforeEach(() => {
        housing.occupancy = OccupancyKindApi.Rent;
      });

      describe('If the housing is not supervised', () => {
        beforeEach(async () => {
          housing.status = HousingStatusApi.Waiting;
          housingEventRepository.find.mockResolvedValue([]);

          // Execute
          const stream = new ReadableStream<SourceHousing>({
            pull(controller) {
              controller.enqueue(sourceHousing);
              controller.close();
            }
          });
          const processor = createSourceHousingProcessor({
            auth,
            reporter: createNoopReporter(),
            banAddressRepository,
            housingRepository,
            housingEventRepository
          });

          await stream.pipeTo(processor);
        });

        it('should set its occupancy as vacant', async () => {
          expect(housingRepository.update).toHaveBeenCalledOnce();
          expect(housingRepository.update).toHaveBeenCalledWith(
            { geoCode: housing.geoCode, id: housing.id },
            {
              dataFileYears: [...housing.dataFileYears, 'lovac-2024'],
              occupancy: OccupancyKindApi.Vacant,
              status: HousingStatusApi.NeverContacted,
              subStatus: null
            }
          );
        });

        it('should create an event "Changement de statut d’occupation" and an event "Changement de statut de suivi"', async () => {
          expect(housingEventRepository.insertMany).toHaveBeenCalledOnce();
          expect(housingEventRepository.insertMany).toHaveBeenCalledWith([
            expect.objectContaining<HousingEventApi>({
              id: expect.any(String),
              name: 'Changement de statut d’occupation',
              kind: 'Update',
              category: 'Followup',
              section: 'Situation',
              conflict: false,
              old: housing,
              new: {
                ...housing,
                occupancy: OccupancyKindApi.Vacant
              },
              createdAt: expect.any(Date),
              createdBy: expect.any(String),
              housingId: housing.id,
              housingGeoCode: housing.geoCode
            }),
            expect.objectContaining<HousingEventApi>({
              id: expect.any(String),
              name: 'Changement de statut de suivi',
              kind: 'Update',
              category: 'Followup',
              section: 'Situation',
              conflict: false,
              old: {
                ...housing,
                occupancy: OccupancyKindApi.Vacant
              },
              new: {
                ...housing,
                occupancy: OccupancyKindApi.Vacant,
                status: HousingStatusApi.NeverContacted,
                subStatus: null
              },
              createdAt: expect.any(Date),
              createdBy: expect.any(String),
              housingId: housing.id,
              housingGeoCode: housing.geoCode
            })
          ]);
          expect(housingEventRepository.insertMany).toHaveBeenCalledWith<
            [HousingEventApi[]]
          >(
            expect.arrayContaining([
              expect.objectContaining<HousingEventApi>({
                id: expect.any(String),
                name: 'Changement de statut d’occupation',
                kind: 'Update',
                category: 'Followup',
                section: 'Situation',
                conflict: false,
                old: housing,
                new: {
                  ...housing,
                  occupancy: OccupancyKindApi.Vacant
                },
                createdAt: expect.any(Date),
                createdBy: expect.any(String),
                housingId: housing.id,
                housingGeoCode: housing.geoCode
              }),
              expect.objectContaining<HousingEventApi>({
                id: expect.any(String),
                name: 'Changement de statut de suivi',
                kind: 'Update',
                category: 'Followup',
                section: 'Situation',
                conflict: false,
                old: {
                  ...housing,
                  occupancy: OccupancyKindApi.Vacant
                },
                new: {
                  ...housing,
                  occupancy: OccupancyKindApi.Vacant,
                  status: HousingStatusApi.NeverContacted,
                  subStatus: null
                },
                createdAt: expect.any(Date),
                createdBy: expect.any(String),
                housingId: housing.id,
                housingGeoCode: housing.geoCode
              })
            ])
          );
        });
      });

      describe('If the housing is supervised', () => {
        const establishment = genEstablishmentApi();
        const creator = genUserApi(establishment.id);
        let events: ReadonlyArray<HousingEventApi>;

        beforeEach(async () => {
          housing.status = HousingStatusApi.Completed;
          housing.subStatus = 'N’était pas vacant';
          events = Array.from({ length: 3 }, () =>
            genHousingEventApi(housing, creator)
          );
          housingEventRepository.find.mockResolvedValue(events);

          const stream = new ReadableStream<SourceHousing>({
            pull(controller) {
              controller.enqueue(sourceHousing);
              controller.close();
            }
          });
          const processor = createSourceHousingProcessor({
            auth,
            reporter: createNoopReporter(),
            banAddressRepository,
            housingRepository,
            housingEventRepository
          });

          await stream.pipeTo(processor);
        });

        it('should append the source and year, but keep the rest as is', async () => {
          expect(housingRepository.update).toHaveBeenCalledOnce();
          expect(housingRepository.update).toHaveBeenCalledWith(
            { geoCode: housing.geoCode, id: housing.id },
            {
              dataFileYears: [...housing.dataFileYears, 'lovac-2024']
            }
          );
        });
      });
    });

    describe('If the housing is vacant', () => {
      beforeEach(() => {
        housing.occupancy = OccupancyKindApi.Vacant;
      });

      describe(`If the housing follow-up is not completed and it was set by users`, () => {
        beforeEach(async () => {
          housing.status = HousingStatusApi.Blocked;
          events.push(genHousingEventApi(housing, creator));

          await stream.pipeTo(processor);
        });

        it('should append the source and year and leave the rest untouched', () => {
          expect(housingRepository.update).toHaveBeenCalledOnce();
          expect(housingRepository.update).toHaveBeenCalledWith(
            { geoCode: housing.geoCode, id: housing.id },
            {
              dataFileYears: [...housing.dataFileYears, 'lovac-2024']
            }
          );
        });
      });

      it('should update the occupancy and the status otherwise', async () => {
        housing.status = HousingStatusApi.Completed;
        housing.subStatus = 'Sortie de la vacance';

        await stream.pipeTo(processor);

        expect(housingRepository.update).toHaveBeenCalledOnce();
        expect(housingRepository.update).toHaveBeenCalledWith(
          {
            geoCode: housing.geoCode,
            id: housing.id
          },
          {
            dataFileYears: [...housing.dataFileYears, 'lovac-2024'],
            occupancy: OccupancyKindApi.Vacant,
            status: HousingStatusApi.NeverContacted,
            subStatus: null
          }
        );
      });
    });
  });
});
