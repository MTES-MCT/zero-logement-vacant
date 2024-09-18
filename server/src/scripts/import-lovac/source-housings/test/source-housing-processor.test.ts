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
  genHousingNoteApi,
  genUserApi
} from '~/test/testFixtures';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { HousingEventApi } from '~/models/EventApi';
import { HousingNoteApi } from '~/models/NoteApi';
import { UserApi } from '~/models/UserApi';

describe('Source housing processor', () => {
  const establishment = genEstablishmentApi();
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    email: 'admin@zerologementvacant.beta.gouv.fr'
  };
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
  let housingNoteRepository: jest.MockedObject<
    ProcessorOptions['housingNoteRepository']
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
    housingNoteRepository = {
      find: jest.fn()
    };
  });

  describe('If the housing is missing from our database', () => {
    let sourceHousing: SourceHousing;

    beforeEach(async () => {
      sourceHousing = genSourceHousing();
      housingRepository.findOne.mockResolvedValue(null);

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
        housingEventRepository,
        housingNoteRepository
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
          label: sourceHousing.ban_address,
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
    let notes: HousingNoteApi[];

    beforeEach(() => {
      sourceHousing = genSourceHousing();
      housing = genHousingApi();
      events = [];
      notes = [];
      housingRepository.findOne.mockResolvedValue(housing);
      housingEventRepository.find.mockResolvedValue(events);
      housingNoteRepository.find.mockResolvedValue(notes);

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
        housingEventRepository,
        housingNoteRepository
      });
    });

    it('should add "lovac-2024" to data file years in all cases', async () => {
      await stream.pipeTo(processor);

      expect(housingRepository.update).toHaveBeenCalledOnce();
      expect(housingRepository.update).toHaveBeenCalledWith(
        { geoCode: housing.geoCode, id: housing.id },
        expect.objectContaining({
          dataFileYears: expect.arrayContaining(['lovac-2024'])
        })
      );
    });

    describe('If the housing has no user event nor user notes', () => {
      beforeEach(() => {
        events = [];
        notes = [];
      });

      describe(`If the housing status is ${HousingStatusApi.Completed} and the sub status is "Sortie de la vacance"`, () => {
        beforeEach(async () => {
          housing.status = HousingStatusApi.Completed;
          housing.subStatus = 'Sortie de la vacance';

          await stream.pipeTo(processor);
        });

        it('should update the data file years, the occupancy, status and substatus', () => {
          expect(housingRepository.update).toHaveBeenCalledOnce();
          expect(housingRepository.update).toHaveBeenCalledWith(
            { geoCode: housing.geoCode, id: housing.id },
            {
              dataFileYears: expect.arrayContaining(['lovac-2024']),
              occupancy: OccupancyKindApi.Vacant,
              status: HousingStatusApi.NeverContacted,
              subStatus: null
            }
          );
        });

        it('should create an event "Changement de statut d’occupation"', () => {});
      });
    });

    describe(`If the housing has no user notes, no user events about status or occupancy, has status ${HousingStatusApi.Completed} and substatus "Sortie de la vacance"`, () => {
      beforeEach(async () => {
        events.push({
          ...genHousingEventApi(housing, admin),
          name: 'Ajout dans une campagne'
        });
        notes.push(genHousingNoteApi(admin, housing));
        housing.status = HousingStatusApi.Completed;
        housing.subStatus = 'Sortie de la vacance';

        await stream.pipeTo(processor);
      });

      it('should update the data file years, the occupancy, status and substatus', () => {
        expect(housingRepository.update).toHaveBeenCalledOnce();
        expect(housingRepository.update).toHaveBeenCalledWith(
          { geoCode: housing.geoCode, id: housing.id },
          {
            dataFileYears: expect.arrayContaining(['lovac-2024']),
            occupancy: OccupancyKindApi.Vacant,
            status: HousingStatusApi.NeverContacted,
            subStatus: null
          }
        );
      });
    });
  });
});
