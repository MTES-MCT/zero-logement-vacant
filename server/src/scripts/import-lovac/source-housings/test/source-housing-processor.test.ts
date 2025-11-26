import { vi, MockedObject } from 'vitest';
import { faker } from '@faker-js/faker/locale/fr';
import {
  HousingStatus,
  Occupancy,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { flatten, toArray } from '@zerologementvacant/utils/node';
import { ReadableStream } from 'node:stream/web';
import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
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
  genEventApi,
  genHousingApi,
  genHousingNoteApi,
  genUserApi
} from '~/test/testFixtures';

describe('Source housing processor', () => {
  const establishment = genEstablishmentApi();
  const user: UserApi = {
    ...genUserApi(establishment.id),
    email: 'test@test.test'
  };
  const admin: UserApi = {
    ...genUserApi(establishment.id),
    email: 'admin@zerologementvacant.beta.gouv.fr'
  };
  let auth: ProcessorOptions['auth'];
  let housingRepository: MockedObject<ProcessorOptions['housingRepository']>;
  let housingEventRepository: MockedObject<
    ProcessorOptions['housingEventRepository']
  >;
  let housingNoteRepository: MockedObject<
    ProcessorOptions['housingNoteRepository']
  >;

  beforeEach(() => {
    auth = genUserApi('');
    housingRepository = {
      findOne: vi.fn()
    };
    housingEventRepository = {
      find: vi.fn()
    };
    housingNoteRepository = {
      find: vi.fn()
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
      expect(actual).toPartiallyContain({
        type: 'housing',
        kind: 'create',
        value: expect.objectContaining({
          dataFileYears: ['lovac-2025'],
          occupancy: Occupancy.VACANT,
          status: HousingStatus.NEVER_CONTACTED
        })
      });
    });

    it('should insert a new BAN address', () => {
      expect(actual).toPartiallyContain({
        type: 'address',
        kind: 'create',
        value: expect.objectContaining<Partial<AddressApi>>({
          banId: sourceHousing.ban_id ?? undefined,
          label: sourceHousing.ban_label ?? undefined,
          latitude: sourceHousing.ban_latitude ?? undefined,
          longitude: sourceHousing.ban_longitude ?? undefined,
          score: sourceHousing.ban_score ?? undefined
        })
      });
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
      housing = {
        ...genHousingApi(),
        dataFileYears: ['lovac-2023', 'lovac-2024']
      };
      events = [];
      notes = [];

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

    describe('If the housing is non-vacant', () => {
      beforeEach(() => {
        housing.occupancy = faker.helpers.arrayElement(
          OCCUPANCY_VALUES.filter((occupancy) => occupancy !== Occupancy.VACANT)
        );
        housing.status = HousingStatus.COMPLETED;
        housingRepository.findOne.mockResolvedValue(housing);
      });

      describe.each([
        {
          name: 'has no user event related to occupancy or status, nor any user note',
          condition() {
            events = [];
            notes = [];
          }
        },
        {
          name: 'has an admin event related to occupancy',
          condition() {
            events = [
              {
                ...genEventApi({
                  type: 'housing:occupancy-updated',
                  creator: admin,
                  nextOld: { occupancy: Occupancy.VACANT },
                  nextNew: { occupancy: housing.occupancy }
                }),
                housingGeoCode: housing.geoCode,
                housingId: housing.id
              }
            ];
            notes = [];
          }
        },
        {
          name: 'has an admin event related to status',
          condition() {
            events = [
              {
                ...genEventApi({
                  type: 'housing:status-updated',
                  creator: admin,
                  nextOld: { status: 'never-contacted' },
                  nextNew: { status: 'completed' }
                }),
                housingGeoCode: housing.geoCode,
                housingId: housing.id
              }
            ];
            notes = [];
          }
        },
        {
          name: 'has an admin note',
          condition() {
            events = [];
            notes = [genHousingNoteApi(admin, housing)];
          }
        }
      ])('If the housing $name', ({ condition }) => {
        let changes: ReadonlyArray<SourceHousingChange>;

        beforeEach(async () => {
          condition();
          housingEventRepository.find.mockResolvedValue(events);
          housingNoteRepository.find.mockResolvedValue(notes);

          changes = await toArray(
            stream.pipeThrough(processor).pipeThrough(flatten())
          );
        });

        it('should set the housing as vacant', async () => {
          expect(changes).toPartiallyContain({
            type: 'housing',
            kind: 'update',
            value: expect.objectContaining<Partial<HousingApi>>({
              dataFileYears: expect.arrayContaining(['lovac-2025']),
              occupancy: Occupancy.VACANT,
              status: HousingStatus.NEVER_CONTACTED,
              subStatus: null
            })
          });
        });

        it('should create an event related to occupancy change', async () => {
          expect(changes).toPartiallyContain({
            type: 'event',
            kind: 'create',
            value: expect.objectContaining<Partial<HousingEventApi>>({
              name: 'Changement de statut d’occupation'
            })
          });
        });

        it('should create an event related to status change', async () => {
          expect(changes).toPartiallyContain({
            type: 'event',
            kind: 'create',
            value: expect.objectContaining<Partial<HousingEventApi>>({
              name: 'Changement de statut de suivi'
            })
          });
        });
      });

      describe.each([
        {
          name: 'has at least one user event related to occupancy',
          condition() {
            events = [
              {
                ...genEventApi({
                  type: 'housing:occupancy-updated',
                  creator: user,
                  nextOld: { occupancy: Occupancy.VACANT },
                  nextNew: { occupancy: housing.occupancy }
                }),
                housingGeoCode: housing.geoCode,
                housingId: housing.id
              }
            ];
          }
        },
        {
          name: 'has at least one user event related to status',
          condition() {
            events = [
              {
                ...genEventApi({
                  type: 'housing:status-updated',
                  creator: user,
                  nextOld: { status: 'never-contacted' },
                  nextNew: { status: 'completed' }
                }),
                housingGeoCode: housing.geoCode,
                housingId: housing.id
              }
            ];
          }
        },
        {
          name: 'has at least one user note',
          condition() {
            notes = [genHousingNoteApi(user, housing)];
          }
        }
      ])('If the housing $name', ({ condition }) => {
        let changes: ReadonlyArray<SourceHousingChange>;

        beforeEach(async () => {
          condition();
          housingEventRepository.find.mockResolvedValue(events);
          housingNoteRepository.find.mockResolvedValue(notes);

          changes = await toArray(
            stream.pipeThrough(processor).pipeThrough(flatten())
          );
        });

        it('should only add it to lovac-2025', () => {
          expect(changes).toHaveLength(1);
          expect(changes).toPartiallyContain({
            type: 'housing',
            kind: 'update',
            value: expect.objectContaining<Partial<HousingApi>>({
              dataFileYears: [...housing.dataFileYears, 'lovac-2025'],
              // Leave the rest unchanged
              occupancy: housing.occupancy,
              status: housing.status,
              subStatus: housing.subStatus
            })
          });
        });
      });
    });

    describe('Otherwise the housing is already vacant', () => {
      beforeEach(() => {
        housing.occupancy = Occupancy.VACANT;
        housingRepository.findOne.mockResolvedValue(housing);
      });

      it('should only add it to `lovac-2025`', async () => {
        const changes = await toArray(
          stream.pipeThrough(processor).pipeThrough(flatten())
        );

        expect(changes).toHaveLength(1);
        expect(changes).toPartiallyContain({
          type: 'housing',
          kind: 'update',
          value: expect.objectContaining<Partial<HousingApi>>({
            dataFileYears: [...housing.dataFileYears, 'lovac-2025'],
            // Leave the rest unchanged
            occupancy: housing.occupancy,
            status: housing.status,
            subStatus: housing.subStatus
          })
        });
      });
    });
  });
});
