import {
  AddressKinds,
  CadastralClassification,
  DataFileYear,
  EventType,
  HousingSource,
  HousingStatus,
  Occupancy,
  toEventHousingStatus
} from '@zerologementvacant/models';
import { v5 as uuidv5 } from 'uuid';
import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import { normalizeDataFileYears } from '~/models/HousingApi';
import { EventRecordDBO } from '~/repositories/eventRepository';
import {
  HousingRecordDBO
} from '~/repositories/housingRepository';
import { NoteRecordDBO } from '~/repositories/noteRepository';
import {
  LOVAC_NAMESPACE,
  ReporterError,
  ReporterOptions
} from '~/scripts/import-lovac/infra';
import { EnrichedSourceHousing } from './source-housing-enricher';
import { SourceHousing } from './source-housing';

type READ_ONLY_FIELDS = 'last_mutation_type' | 'plot_area' | 'occupancy_history';
export type HousingRecordInsert = Omit<HousingRecordDBO, READ_ONLY_FIELDS>;

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update';
  value: Value;
}

export type HousingChange = Change<HousingRecordInsert, 'housing'>;
export type HousingEventChange = Change<HousingEventApi, 'event'>;
export type AddressChange = Change<AddressApi, 'address'>;
export type SourceHousingChange =
  | HousingChange
  | HousingEventChange
  | AddressChange;

interface TransformOptions extends ReporterOptions<SourceHousing> {
  adminUserId: string;
  year: string;
}

export function createHousingTransform(opts: TransformOptions) {
  const { reporter, abortEarly, adminUserId, year } = opts;

  return function transform(
    enriched: EnrichedSourceHousing
  ): SourceHousingChange[] {
    const { source, existing } = enriched;
    try {
      const changes = existing.housing
        ? toUpdate(source, existing.housing, existing.events, existing.notes, { adminUserId, year })
        : toCreate(source, year);
      reporter.passed(source);
      return changes;
    } catch (error) {
      reporter.failed(
        source,
        new ReporterError((error as Error).message, source)
      );
      if (abortEarly) throw error;
      return [];
    }
  };
}

function toCreate(source: SourceHousing, year: string): SourceHousingChange[] {
  const id = uuidv5(source.local_id + ':' + source.geo_code, LOVAC_NAMESPACE);

  const housing: HousingRecordInsert = {
    id,
    invariant: source.invariant,
    local_id: source.local_id,
    building_id: source.building_id,
    building_group_id: null,
    building_location: source.building_location,
    building_year: source.building_year ?? null,
    plot_id: source.plot_id,
    geo_code: source.geo_code,
    address_dgfip: [source.dgfip_address],
    longitude_dgfip: source.dgfip_longitude ?? null,
    latitude_dgfip: source.dgfip_latitude ?? null,
    geolocation: null,
    cadastral_classification: source.cadastral_classification,
    uncomfortable: source.uncomfortable ?? false,
    vacancy_start_year: source.vacancy_start_year,
    housing_kind: source.housing_kind,
    rooms_count: source.rooms_count,
    living_area: source.living_area,
    cadastral_reference: source.cadastral_reference,
    beneficiary_count: null,
    taxed: source.taxed,
    rental_value: source.rental_value ?? null,
    condominium: source.condominium ?? null,
    occupancy: Occupancy.VACANT,
    occupancy_source: Occupancy.VACANT,
    occupancy_intended: null,
    status: HousingStatus.NEVER_CONTACTED,
    sub_status: null,
    data_years: [2024],
    data_file_years: [year as DataFileYear],
    data_source: 'lovac' as HousingSource,
    actual_dpe: null,
    energy_consumption_bdnb: null,
    energy_consumption_at_bdnb: null,
    last_mutation_date: source.last_mutation_date ?? null,
    last_transaction_date: source.last_transaction_date ?? null,
    last_transaction_value: source.last_transaction_value,
    mutation_date: null
  };

  const changes: SourceHousingChange[] = [
    { type: 'housing', kind: 'create', value: housing }
  ];

  if (source.ban_label) {
    const address: AddressApi = {
      refId: id,
      addressKind: AddressKinds.Housing,
      banId: source.ban_id ?? undefined,
      label: source.ban_label,
      postalCode: '',
      city: '',
      latitude: source.ban_latitude ?? undefined,
      longitude: source.ban_longitude ?? undefined,
      score: source.ban_score ?? undefined
    };
    changes.push({ type: 'address', kind: 'create', value: address });
  }

  return changes;
}

function toUpdate(
  source: SourceHousing,
  existing: HousingRecordDBO,
  events: ReadonlyArray<EventRecordDBO<EventType>>,
  notes: ReadonlyArray<NoteRecordDBO>,
  opts: { adminUserId: string; year: string }
): SourceHousingChange[] {
  const { adminUserId, year } = opts;
  const dataFileYears = normalizeDataFileYears(
    (existing.data_file_years ?? []).concat(year as DataFileYear)
  ) as DataFileYear[];

  const patch = applyChanges(existing, events, notes, adminUserId);
  const eventChanges: HousingEventChange[] = [];

  if (
    patch.occupancy !== undefined &&
    existing.occupancy !== patch.occupancy
  ) {
    eventChanges.push({
      type: 'event',
      kind: 'create',
      value: {
        id: uuidv5(
          existing.id + ':housing:occupancy-updated:' + year,
          LOVAC_NAMESPACE
        ),
        type: 'housing:occupancy-updated',
        nextOld: { occupancy: existing.occupancy },
        nextNew: { occupancy: patch.occupancy },
        createdBy: adminUserId,
        createdAt: new Date().toISOString(),
        housingGeoCode: existing.geo_code,
        housingId: existing.id
      }
    });
  }

  if (
    patch.status !== undefined &&
    existing.status !== patch.status
  ) {
    eventChanges.push({
      type: 'event',
      kind: 'create',
      value: {
        id: uuidv5(
          existing.id + ':housing:status-updated:' + year,
          LOVAC_NAMESPACE
        ),
        type: 'housing:status-updated',
        nextOld: {
          status: toEventHousingStatus(existing.status),
          subStatus: existing.sub_status
        },
        nextNew: {
          status: toEventHousingStatus(patch.status ?? existing.status),
          subStatus: patch.sub_status ?? null
        },
        createdBy: adminUserId,
        createdAt: new Date().toISOString(),
        housingGeoCode: existing.geo_code,
        housingId: existing.id
      }
    });
  }

  const housing: HousingRecordInsert = {
    ...existing,
    ...patch,
    data_file_years: dataFileYears,
    local_id: source.local_id,
    invariant: source.invariant,
    building_id: source.building_id,
    building_location: source.building_location,
    building_year: source.building_year ?? null,
    plot_id: source.plot_id,
    address_dgfip: [source.dgfip_address],
    longitude_dgfip: source.dgfip_longitude ?? null,
    latitude_dgfip: source.dgfip_latitude ?? null,
    housing_kind: source.housing_kind,
    condominium: source.condominium ?? null,
    living_area: source.living_area,
    rooms_count: source.rooms_count,
    uncomfortable: source.uncomfortable ?? false,
    cadastral_classification:
      (source.cadastral_classification as CadastralClassification) ?? null,
    cadastral_reference: source.cadastral_reference,
    taxed: source.taxed,
    rental_value: source.rental_value ?? null,
    vacancy_start_year: source.vacancy_start_year,
    last_mutation_date: source.last_mutation_date ?? null,
    last_transaction_date: source.last_transaction_date ?? null,
    last_transaction_value: source.last_transaction_value
  };

  return [
    { type: 'housing', kind: 'update', value: housing },
    ...eventChanges
  ];
}

function applyChanges(
  housing: HousingRecordDBO,
  events: ReadonlyArray<EventRecordDBO<EventType>>,
  notes: ReadonlyArray<NoteRecordDBO>,
  adminUserId: string
): Partial<HousingRecordInsert> {
  const rules: ReadonlyArray<() => boolean> = [
    () => housing.occupancy !== Occupancy.VACANT,
    () =>
      events.length === 0 ||
      !hasUserEvents(events, adminUserId),
    () =>
      notes.length === 0 ||
      !hasUserNotes(notes, adminUserId)
  ];

  if (rules.every((rule) => rule())) {
    return {
      occupancy: Occupancy.VACANT,
      status: HousingStatus.NEVER_CONTACTED,
      sub_status: null
    };
  }

  return {};
}

function hasUserEvents(
  events: ReadonlyArray<EventRecordDBO<EventType>>,
  adminUserId: string
): boolean {
  return events
    .filter((e) =>
      ['housing:occupancy-updated', 'housing:status-updated'].includes(e.type)
    )
    .some((e) => e.created_by !== adminUserId);
}

function hasUserNotes(
  notes: ReadonlyArray<NoteRecordDBO>,
  adminUserId: string
): boolean {
  return notes.some((n) => n.created_by !== adminUserId);
}
