import {
  AddressKinds,
  CadastralClassification,
  Occupancy
} from '@zerologementvacant/models';
import { Predicate } from '@zerologementvacant/utils';
import { map } from '@zerologementvacant/utils/node';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import {
  HousingEventApi,
  isUserModified as isEventUserModified
} from '~/models/EventApi';
import {
  HousingApi,
  HousingId,
  normalizeDataFileYears
} from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import {
  HousingNoteApi,
  isUserModified as isNoteUserModified
} from '~/models/NoteApi';
import { UserApi } from '~/models/UserApi';
import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';

const logger = createLogger('sourceHousingProcessor');

/**
 * @example
 * Change<SourceHousing, 'housing'>
 */
interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update' | 'delete';
  value: Value;
}

export type HousingChange = Change<HousingApi, 'housing'>;
export type HousingEventChange = Change<HousingEventApi, 'event'>;
export type AddressChange = Change<AddressApi, 'address'>;

export type SourceHousingChange =
  | HousingChange
  | HousingEventChange
  | AddressChange;

export interface ProcessorOptions extends ReporterOptions<SourceHousing> {
  auth: UserApi;
  housingEventRepository: {
    find(id: HousingId): Promise<ReadonlyArray<HousingEventApi>>;
  };
  housingNoteRepository: {
    find(id: HousingId): Promise<ReadonlyArray<HousingNoteApi>>;
  };
  housingRepository: {
    findOne(geoCode: string, localId: string): Promise<HousingApi | null>;
  };
}

export function createSourceHousingProcessor(opts: ProcessorOptions) {
  const {
    abortEarly,
    auth,
    housingEventRepository,
    housingNoteRepository,
    housingRepository,
    reporter
  } = opts;

  return map<SourceHousing, ReadonlyArray<SourceHousingChange>>(
    async (sourceHousing) => {
      try {
        logger.debug('Processing source housing...', { sourceHousing });

        const existingHousing = await housingRepository.findOne(
          sourceHousing.geo_code,
          sourceHousing.local_id
        );
        if (!existingHousing) {
          const housing: HousingApi = {
            id: uuidv4(),
            invariant: sourceHousing.invariant,
            localId: sourceHousing.local_id,
            buildingId: sourceHousing.building_id,
            buildingGroupId: undefined,
            buildingLocation: sourceHousing.building_location,
            buildingYear: sourceHousing.building_year ?? undefined,
            plotId: sourceHousing.plot_id,
            geoCode: sourceHousing.geo_code,
            rawAddress: [sourceHousing.dgfip_address],
            longitude: sourceHousing.dgfip_longitude ?? undefined,
            latitude: sourceHousing.dgfip_latitude ?? undefined,
            housingKind: sourceHousing.housing_kind,
            ownershipKind: sourceHousing.condominium ?? undefined,
            livingArea: sourceHousing.living_area,
            roomsCount: sourceHousing.rooms_count,
            uncomfortable: sourceHousing.uncomfortable ?? false,
            cadastralClassification: sourceHousing.cadastral_classification,
            cadastralReference: sourceHousing.cadastral_reference,
            beneficiaryCount: undefined,
            geolocation: undefined,
            taxed: sourceHousing.taxed,
            rentalValue: sourceHousing.rental_value ?? undefined,
            occupancy: Occupancy.VACANT,
            occupancyRegistered: Occupancy.VACANT,
            occupancyIntended: null,
            vacancyStartYear: sourceHousing.vacancy_start_year,
            mutationDate: sourceHousing.mutation_date,
            lastMutationDate: sourceHousing.last_mutation_date,
            lastTransactionDate: sourceHousing.last_transaction_date,
            lastTransactionValue: sourceHousing.last_transaction_value,
            deprecatedVacancyReasons: null,
            deprecatedPrecisions: null,
            source: 'lovac',
            dataYears: [2024],
            dataFileYears: ['lovac-2025'],
            status: HousingStatusApi.NeverContacted,
            subStatus: null,
            energyConsumption: null,
            energyConsumptionAt: null
          };
          const housingChange: HousingChange = {
            type: 'housing',
            kind: 'create',
            value: housing
          };
          const changes: SourceHousingChange[] = [housingChange];

          if (sourceHousing.ban_label) {
            const address: AddressApi = {
              refId: housing.id,
              addressKind: AddressKinds.Housing,
              banId: sourceHousing.ban_id ?? undefined,
              label: sourceHousing.ban_label,
              postalCode: '',
              city: '',
              latitude: sourceHousing.ban_latitude ?? undefined,
              longitude: sourceHousing.ban_longitude ?? undefined,
              score: sourceHousing.ban_score ?? undefined
            };
            changes.push({
              kind: 'create',
              type: 'address',
              value: address
            });
          }
          reporter.passed(sourceHousing);
          return changes;
        }

        // The housing exists
        const [existingEvents, existingNotes] = await Promise.all([
          housingEventRepository.find({
            id: existingHousing.id,
            geoCode: existingHousing.geoCode
          }),
          housingNoteRepository.find({
            id: existingHousing.id,
            geoCode: existingHousing.geoCode
          })
        ]);

        const dataFileYears = normalizeDataFileYears(
          existingHousing.dataFileYears.concat('lovac-2025')
        );
        const events: HousingEventApi[] = [];

        const patch = applyChanges(
          existingHousing,
          existingEvents,
          existingNotes
        );
        if (
          patch.occupancy !== undefined &&
          existingHousing.occupancy !== patch.occupancy
        ) {
          events.push({
            id: uuidv4(),
            name: 'Changement de statut d’occupation',
            kind: 'Update',
            category: 'Followup',
            section: 'Situation',
            conflict: false,
            // Assert types until we change the Event API
            old: { occupancy: existingHousing.occupancy } as HousingApi,
            new: { occupancy: patch.occupancy } as HousingApi,
            createdBy: auth.id,
            createdAt: new Date(),
            housingGeoCode: existingHousing.geoCode,
            housingId: existingHousing.id
          });
        }
        if (
          patch.status !== undefined &&
          existingHousing.status !== patch.status
        ) {
          events.push({
            id: uuidv4(),
            name: 'Changement de statut de suivi',
            kind: 'Update',
            category: 'Followup',
            section: 'Situation',
            conflict: false,
            // This event should come after the above one
            old: {
              status: existingHousing.status,
              subStatus: existingHousing.subStatus
            } as HousingApi,
            new: {
              status: patch.status,
              subStatus: patch.subStatus
            } as HousingApi,
            createdBy: auth.id,
            createdAt: new Date(),
            housingGeoCode: existingHousing.geoCode,
            housingId: existingHousing.id
          });
        }

        const housing: HousingApi = {
          ...existingHousing,
          ...patch,
          dataFileYears,
          localId: sourceHousing.local_id,
          invariant: sourceHousing.invariant,
          // Other updatable properties
          buildingId: sourceHousing.building_id,
          buildingLocation: sourceHousing.building_location,
          buildingYear: sourceHousing.building_year ?? undefined,
          plotId: sourceHousing.plot_id,
          rawAddress: [sourceHousing.dgfip_address],
          latitude: sourceHousing.dgfip_latitude ?? undefined,
          longitude: sourceHousing.dgfip_longitude ?? undefined,
          housingKind: sourceHousing.housing_kind,
          ownershipKind: sourceHousing.condominium ?? undefined,
          livingArea: sourceHousing.living_area,
          roomsCount: sourceHousing.rooms_count,
          uncomfortable: sourceHousing.uncomfortable ?? false,
          cadastralClassification:
            (sourceHousing.cadastral_classification as CadastralClassification) ??
            null,
          cadastralReference: sourceHousing.cadastral_reference,
          taxed: sourceHousing.taxed,
          rentalValue: sourceHousing.rental_value ?? undefined,
          vacancyStartYear: sourceHousing.vacancy_start_year,
          mutationDate: sourceHousing.mutation_date,
          lastMutationDate: sourceHousing.last_mutation_date,
          lastTransactionDate: sourceHousing.last_transaction_date,
          lastTransactionValue: sourceHousing.last_transaction_value
        };

        reporter.passed(sourceHousing);
        const changes: SourceHousingChange[] = [
          {
            type: 'housing',
            kind: 'update',
            value: housing
          },
          ...events.map<HousingEventChange>((event) => ({
            type: 'event',
            kind: 'create',
            value: event
          }))
        ];
        return changes;
      } catch (error) {
        reporter.failed(
          sourceHousing,
          new ReporterError((error as Error).message, sourceHousing)
        );
        if (abortEarly) {
          throw error;
        }
        return [];
      }
    }
  );
}

function applyChanges(
  housing: HousingApi,
  events: ReadonlyArray<HousingEventApi>,
  notes: ReadonlyArray<HousingNoteApi>
): Partial<HousingApi> {
  const rules: ReadonlyArray<Predicate<void>> = [
    () => housing.occupancy !== Occupancy.VACANT,
    () => events.length === 0 || !hasUserEvents(events),
    () => notes.length === 0 || !hasUserNotes(notes)
  ];

  if (rules.every((rule) => rule())) {
    return {
      occupancy: Occupancy.VACANT,
      status: HousingStatusApi.NeverContacted,
      subStatus: null
    };
  }

  return {};
}

function hasUserNotes(notes: ReadonlyArray<HousingNoteApi>): boolean {
  return notes.length > 0 && notes.some(isNoteUserModified);
}

function hasUserEvents(events: ReadonlyArray<HousingEventApi>): boolean {
  return (
    events.length > 0 &&
    events
      .filter((event) =>
        [
          'Changement de statut de suivi',
          'Changement de statut d’occupation'
        ].includes(event.name)
      )
      .some(isEventUserModified)
  );
}
