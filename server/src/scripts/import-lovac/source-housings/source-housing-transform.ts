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
import { Array, Option, Order, pipe } from 'effect';
import { v5 as uuidv5 } from 'uuid';
import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import { normalizeDataFileYears } from '~/models/HousingApi';
import { EventRecordDBO } from '~/repositories/eventRepository';
import { HousingRecordDBO } from '~/repositories/housingRepository';
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
        ? toUpdate(source, existing.housing, existing.events, {
            adminUserId,
            year
          })
        : toCreate(source, { adminUserId, year });
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

function toCreate(
  source: SourceHousing,
  opts: { adminUserId: string; year: string }
): SourceHousingChange[] {
  const { adminUserId, year } = opts;
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
    longitude_dgfip: source.longitude_dgfip ?? null,
    latitude_dgfip: source.latitude_dgfip ?? null,
    geolocation: null,
    cadastral_classification: source.cadastral_classification,
    uncomfortable: source.uncomfortable ?? false,
    vacancy_start_year: source.vacancy_start_year,
    housing_kind: source.housing_kind,
    rooms_count: source.rooms_count,
    living_area: source.living_area,
    cadastral_reference: null,
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
    { type: 'housing', kind: 'create', value: housing },
    {
      type: 'event',
      kind: 'create',
      value: {
        id: uuidv5(id + ':housing:created:' + year, LOVAC_NAMESPACE),
        type: 'housing:created',
        nextOld: null,
        nextNew: {
          source: year as DataFileYear,
          occupancy: Occupancy.VACANT
        },
        createdBy: adminUserId,
        createdAt: new Date().toISOString(),
        housingGeoCode: source.geo_code,
        housingId: id
      }
    }
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
  opts: { adminUserId: string; year: string }
): SourceHousingChange[] {
  const { adminUserId, year } = opts;
  const dataFileYears = normalizeDataFileYears(
    (existing.data_file_years ?? []).concat(year as DataFileYear)
  ) as DataFileYear[];

  const patch = applyChanges(events, existing.occupancy, adminUserId);
  const eventChanges: HousingEventChange[] = [];

  if (patch.occupancy !== undefined && existing.occupancy !== patch.occupancy) {
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

  if (patch.status !== undefined && existing.status !== patch.status) {
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
    longitude_dgfip: source.longitude_dgfip ?? null,
    latitude_dgfip: source.latitude_dgfip ?? null,
    housing_kind: source.housing_kind,
    condominium: source.condominium ?? null,
    living_area: source.living_area,
    rooms_count: source.rooms_count,
    uncomfortable: source.uncomfortable ?? false,
    cadastral_classification:
      (source.cadastral_classification as CadastralClassification) ?? null,
    cadastral_reference: null,
    taxed: source.taxed,
    rental_value: source.rental_value ?? null,
    vacancy_start_year: source.vacancy_start_year,
    last_mutation_date: source.last_mutation_date ?? null,
    last_transaction_date: source.last_transaction_date ?? null,
    last_transaction_value: source.last_transaction_value
  };

  return [{ type: 'housing', kind: 'update', value: housing }, ...eventChanges];
}

const byCreatedAt = Order.mapInput(
  Order.Date,
  (event: EventRecordDBO<EventType>) => new Date(event.created_at)
);

function applyChanges(
  events: ReadonlyArray<EventRecordDBO<EventType>>,
  existingOccupancy: string,
  adminUserId: string
): Partial<HousingRecordInsert> {
  // Already vacant in our DB — LOVAC confirms it; preserve occupancy/status.
  if (existingOccupancy === Occupancy.VACANT) {
    return {};
  }
  const lastStatusOccupancyEvent = pipe(
    events,
    Array.filter((event) =>
      ['housing:occupancy-updated', 'housing:status-updated'].includes(
        event.type
      )
    ),
    Array.sort(byCreatedAt),
    Array.last,
    Option.getOrNull
  );

  if (
    !lastStatusOccupancyEvent ||
    lastStatusOccupancyEvent.created_by === adminUserId
  ) {
    return {
      occupancy: Occupancy.VACANT,
      status: HousingStatus.NEVER_CONTACTED,
      sub_status: null
    };
  }

  return {};
}
