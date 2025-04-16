import { Occupancy } from '@zerologementvacant/models';
import { flatten, toArray } from '@zerologementvacant/utils/node';
import { ReadableStream } from 'node:stream/web';
import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi, OccupancyKindApi } from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { HousingNoteApi } from '~/models/NoteApi';
import { UserApi } from '~/models/UserApi';
import { genSourceHousing } from '~/scripts/import-lovac/infra/fixtures';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';

import {
  createSourceHousingProcessor,
  ProcessorOptions,
  SourceHousingChange
} from '~/scripts/import-lovac/source-housings/source-housing-processor';
import {
  genEstablishmentApi,
  genHousingApi,
  genHousingEventApi,
  genHousingNoteApi,
  genUserApi
} from '~/test/testFixtures';

describe('Source housing processor', () => {
  const establishment = genEstablishmentApi();
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    email: 'admin@zerologementvacant.beta.gouv.fr'
  };
  let auth: ProcessorOptions['auth'];
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
    housingRepository = {
      findOne: jest.fn()
    };
    housingEventRepository = {
      find: jest.fn()
    };
    housingNoteRepository = {
      find: jest.fn()
    };
  });

  describe('If the housing is missing from our database', () => {
    let sourceHousing: SourceHousing;
    let actual: ReadonlyArray<SourceHousingChange>;

    beforeEach(async () => {
      sourceHousing = genSourceHousing();
      housingRepository.findOne.mockResolvedValue(null);

      const stream = new ReadableStream<SourceHousing>({
        start(controller) {
          controller.enqueue(sourceHousing);
          controller.close();
        }
      });
      const processor = createSourceHousingProcessor({
        auth,
        reporter: createNoopReporter(),
        housingRepository,
        housingEventRepository,
        housingNoteRepository
      });

      actual = await toArray(
        stream.pipeThrough(processor).pipeThrough(flatten())
      );
    });

    it('should insert a new housing', () => {
      expect(actual).toIncludeAllMembers([
        {
          type: 'housing',
          kind: 'create',
          value: expect.objectContaining({
            dataFileYears: ['lovac-2025'],
            occupancy: OccupancyKindApi.Vacant,
            status: HousingStatusApi.NeverContacted
          })
        }
      ]);
    });

    it('should insert a new BAN address', () => {
      expect(actual).toIncludeAllMembers([
        {
          type: 'address',
          kind: 'create',
          value: expect.objectContaining<Partial<AddressApi>>({
            banId: sourceHousing.ban_id ?? undefined,
            label: sourceHousing.ban_label ?? undefined,
            latitude: sourceHousing.ban_latitude ?? undefined,
            longitude: sourceHousing.ban_longitude ?? undefined,
            score: sourceHousing.ban_score ?? undefined
          })
        }
      ]);
    });
  });

  describe('If the housing is present in our database', () => {
    let stream: ReadableStream<SourceHousing>;
    let processor: ReturnType<typeof createSourceHousingProcessor>;
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
        housingRepository,
        housingEventRepository,
        housingNoteRepository
      });
    });

    it('should add "lovac-2025" to data file years in all cases', async () => {
      const actual = await toArray(
        stream.pipeThrough(processor).pipeThrough(flatten())
      );

      expect(actual).toIncludeAllMembers<SourceHousingChange>([
        {
          type: 'housing',
          kind: expect.any(String),
          value: expect.objectContaining({
            dataFileYears: expect.arrayContaining(['lovac-2025'])
          })
        }
      ]);
    });

    describe('If the housing has no user event nor user notes', () => {
      beforeEach(() => {
        events = [];
        notes = [];
      });

      describe(`If the housing status is ${HousingStatusApi.Completed} and the sub status is "Sortie de la vacance"`, () => {
        let actual: ReadonlyArray<SourceHousingChange>;

        beforeEach(async () => {
          housing.status = HousingStatusApi.Completed;
          housing.subStatus = 'Sortie de la vacance';

          actual = await toArray(
            stream.pipeThrough(processor).pipeThrough(flatten())
          );
        });

        it('should update the data file years, the occupancy, status and substatus', () => {
          expect(actual).toIncludeAllMembers([
            {
              type: 'housing',
              kind: 'update',
              value: expect.objectContaining<Partial<HousingApi>>({
                id: housing.id,
                geoCode: housing.geoCode,
                dataFileYears: expect.arrayContaining(['lovac-2025']),
                occupancy: Occupancy.VACANT,
                status: HousingStatusApi.NeverContacted,
                subStatus: null
              })
            }
          ]);
        });

        it('should create an event "Changement de statut d’occupation"', () => {
          expect(actual).toIncludeAllMembers<SourceHousingChange>([
            {
              type: 'event',
              kind: 'create',
              value: expect.objectContaining<
                Partial<SourceHousingChange['value']>
              >({
                name: 'Changement de statut d’occupation',
                kind: 'Update',
                housingGeoCode: housing.geoCode,
                housingId: housing.id
              })
            }
          ]);
        });
      });
    });

    describe(`If the housing has no user notes, no user events about status or occupancy, has status ${HousingStatusApi.Completed} and substatus "Sortie de la vacance"`, () => {
      let actual: ReadonlyArray<SourceHousingChange>;

      beforeEach(async () => {
        events.push({
          ...genHousingEventApi(housing, admin),
          name: 'Ajout dans une campagne'
        });
        notes.push(genHousingNoteApi(admin, housing));
        housing.status = HousingStatusApi.Completed;
        housing.subStatus = 'Sortie de la vacance';

        actual = await toArray(
          stream.pipeThrough(processor).pipeThrough(flatten())
        );
      });

      it('should update the data file years, the occupancy, status and substatus', () => {
        expect(actual).toIncludeAllMembers<SourceHousingChange>([
          {
            type: 'housing',
            kind: 'update',
            value: expect.objectContaining<Partial<HousingApi>>({
              id: housing.id,
              geoCode: housing.geoCode,
              dataFileYears: expect.arrayContaining(['lovac-2025']),
              occupancy: Occupancy.VACANT,
              status: HousingStatusApi.NeverContacted,
              subStatus: null
            })
          }
        ]);
      });
    });
  });
});
