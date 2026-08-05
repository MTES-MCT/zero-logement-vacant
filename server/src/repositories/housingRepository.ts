import { ReadableStream } from 'node:stream/web';

import {
  AddressKinds,
  DataFileYear,
  EnergyConsumption,
  HOUSING_STATUS_VALUES,
  HousingKind,
  HousingSource,
  HousingStatus,
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES,
  Mutation,
  MUTATION_TYPE_VALUES,
  MutationType,
  Occupancy,
  OWNER_KIND_LABELS,
  PaginationOptions,
  Precision,
  READ_ONLY_OCCUPANCY_VALUES,
  READ_WRITE_OCCUPANCY_VALUES,
  type CadastralClassification,
  type HousingPointField,
  type Pagination,
  type RelativeLocation
} from '@zerologementvacant/models';
import { compactUndefined, isNotNull } from '@zerologementvacant/utils';
import { Array, identity, pipe, Predicate, Record, Struct } from 'effect';
import { snakeToCamel } from 'effect/String';
import type { Point } from 'geojson';
import type {
  Expression,
  ExpressionBuilder,
  Insertable,
  Selectable,
  SelectQueryBuilder,
  SqlBool
} from 'kysely';
import { sql } from 'kysely';
import { jsonArrayFrom, jsonObjectFrom } from 'kysely/helpers/postgres';
import { match, Pattern } from 'ts-pattern';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import type { EstablishmentApi } from '~/models/EstablishmentApi';
import {
  HousingApi,
  HousingRecordApi,
  HousingSortApi,
  type HousingId
} from '~/models/HousingApi';
import { HousingCountApi } from '~/models/HousingCountApi';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { OwnerApi } from '~/models/OwnerApi';
import { DEFAULT_PAGINATION, toLimitOffset } from '~/models/PaginationApi';
import { normalizeAddressQuery } from '~/utils/addressNormalization';

import { AddressDBO } from './banAddressesRepository';
import {
  fromRelativeLocationDBO,
  relativeLocationFilterToDBO
} from './housingOwnerRepository';
import { OwnerDBO, parseOwnerApi } from './ownerRepository';
import { map } from '@zerologementvacant/utils/node';

const logger = createLogger('housingRepository');

export const housingTable = 'fast_housing';
export const buildingTable = 'buildings';

export const Housing = (transaction = db) =>
  transaction<HousingDBO>(housingTable);

export const ReferenceDataYear = 2023;

interface FindOptions extends PaginationOptions {
  // Optional: geo resolution defaults to no filter, like `count`/`stream`.
  filters?: HousingFiltersApi;
  sort?: HousingSortApi;
  includes?: HousingInclude[];
  fields?: ReadonlyArray<HousingPointField>;
}

/**
 * Columns added to the base `fast_housing` row by {@link includeQuery}. Each is
 * optional on the row because `$if` only ever *adds* the selection — it can't
 * prove, from a runtime `includes` array, that a column is present.
 */
interface HousingIncludeColumns {
  owner: OwnerDBO | null;
  campaigns: Array<{ id: string }>;
  precisions: Precision[];
  buildingClassDpe: EnergyConsumption | null;
  buildingDpeDateAt: Date | string | null;
  geoPerimeters: string[] | null;
}

type HousingRowNext = Selectable<DB['fastHousing']> &
  Partial<HousingIncludeColumns>;

// HousingPointField -> fast_housing column ref (used by projectQuery).
const POINT_COLUMN: Record<HousingPointField, `fastHousing.${string}`> = {
  id: 'fastHousing.id',
  geoCode: 'fastHousing.geoCode',
  latitude: 'fastHousing.latitudeDgfip',
  longitude: 'fastHousing.longitudeDgfip',
  status: 'fastHousing.status',
  occupancy: 'fastHousing.occupancy',
  subStatus: 'fastHousing.subStatus',
  rawAddress: 'fastHousing.addressDgfip'
};

/**
 * Widens `HousingApi` so the properties backed by an include are *required* for
 * exactly the includes requested. `'owner' extends I` (literal on the left, the
 * union `I` on the right) tests membership without distributing over `I`.
 */
type HousingIncludes<I extends HousingInclude> = ('owner' extends I
  ? { owner: OwnerApi | null; ownerRelativeLocation: RelativeLocation | null }
  : unknown) &
  ('campaigns' extends I ? { campaignIds: string[] } : unknown) &
  ('precisions' extends I ? { precisions: Precision[] } : unknown) &
  ('buildings' extends I
    ? {
        energyConsumption: EnergyConsumption | null;
        energyConsumptionAt: Date | null;
      }
    : unknown) &
  ('perimeters' extends I ? { geoPerimeters: string[] } : unknown);

// Sparse projection: narrows the result to the requested point `fields`.
function find<const F extends HousingPointField>(
  options: FindOptions & { fields: readonly F[]; includes?: never }
): Promise<ReadonlyArray<Pick<HousingApi, F | 'id'>>>;
// Full hydration: narrows the result to the requested `includes`.
function find<const I extends HousingInclude = never>(
  options?: FindOptions & { includes?: readonly I[]; fields?: never }
): Promise<ReadonlyArray<HousingApi & HousingIncludes<I>>>;
async function find(
  options: FindOptions = { filters: {} }
): Promise<ReadonlyArray<Partial<HousingApi>>> {
  logger.debug('housingRepository.find', options);

  const filters = options.filters ?? {};

  if (options.fields?.length) {
    // Columns are aliased to their DTO field names and `id` is always selected,
    // so the raw row is already a Pick<HousingApi, …> — no full-row parse, which
    // would leak computed fields (campaignIds, contactCount) into the response.
    const rows = await pipe(
      kysely.selectFrom('fastHousing'),
      filterQuery(filters),
      projectQuery(options.fields),
      paginateQuery(options.pagination)
    ).execute();
    return rows;
  }

  const rows = await pipe(
    kysely.selectFrom('fastHousing').selectAll('fastHousing'),
    filterQuery(filters),
    includeQuery(
      withImplicitIncludes(options.includes, filters),
      filters.establishmentIds
    ),
    sortQuery(options.sort),
    paginateQuery(options.pagination)
  ).execute();
  return rows.map(parseHousingRowNext);
}

/**
 * Owner-based and campaign filters historically pulled in the matching include,
 * so a filtered result still carried the data it matched on. Preserve that: add
 * `owner`/`campaigns` implicitly when a filter needs them.
 */
function withImplicitIncludes(
  includes: ReadonlyArray<HousingInclude> = [],
  filters: HousingFiltersApi
): HousingInclude[] {
  const result = [...includes];
  const filterByOwner = [
    filters.ownerIds,
    filters.ownerKinds,
    filters.ownerAges,
    filters.multiOwners,
    filters.query
  ].some((filter) => filter?.length);
  if (filterByOwner && !result.includes('owner')) {
    result.push('owner');
  }
  if (
    (filters.campaignIds?.length || filters.campaignCount !== undefined) &&
    !result.includes('campaigns')
  ) {
    result.push('campaigns');
  }
  return result;
}

// Sparse map projection: selects only the requested point columns. The dynamic
// column array can't be tracked by Kysely, so the output type is asserted from
// the `fields` tuple — sound because the columns come from the point allowlist.
function projectQuery<const F extends HousingPointField>(fields: readonly F[]) {
  // Always include id; alias each column to its DTO field name so the row is a
  // ready-to-serialize Pick<HousingApi, F | 'id'>.
  const selected: HousingPointField[] = [
    'id',
    ...fields.filter((field) => field !== 'id')
  ];
  const columns = selected.map((field) => `${POINT_COLUMN[field]} as ${field}`);
  return <O>(query: SelectQueryBuilder<DB, 'fastHousing', O>) =>
    query.select(columns as never) as unknown as SelectQueryBuilder<
      DB,
      'fastHousing',
      Pick<HousingApi, F | 'id'>
    >;
}

function sortQuery(sort?: HousingSortApi) {
  return <O>(query: SelectQueryBuilder<DB, 'fastHousing', O>) => {
    if (!sort) {
      return query.orderBy('fastHousing.geoCode').orderBy('fastHousing.id');
    }
    let q = query;
    if (sort.status) {
      q = q.orderBy('fastHousing.status', sort.status);
    }
    if (sort.occupancy) {
      q = q.orderBy(sql`lower(fast_housing.occupancy)`, sort.occupancy);
    }
    if (sort.owner) {
      q = q.orderBy(
        (eb) =>
          eb
            .selectFrom('ownersHousing')
            .innerJoin('owners', 'owners.id', 'ownersHousing.ownerId')
            .whereRef(
              'ownersHousing.housingGeoCode',
              '=',
              'fastHousing.geoCode'
            )
            .whereRef('ownersHousing.housingId', '=', 'fastHousing.id')
            .where('ownersHousing.rank', '=', 1)
            .select('owners.fullName')
            .limit(1),
        sort.owner
      );
    }
    return q;
  };
}

function parseHousingRowNext(row: HousingRowNext): HousingApi {
  return {
    ...parseHousingRecordRow(row),
    owner: row.owner ? parseOwnerApi(row.owner) : null,
    ownerRelativeLocation: fromRelativeLocationDBO(
      (row.owner as { locprop_relative_ban?: number | null } | null | undefined)
        ?.locprop_relative_ban ?? null
    ),
    campaignIds: (row.campaigns ?? []).map((campaign) => campaign.id),
    precisions: row.precisions,
    energyConsumption: (row.buildingClassDpe ??
      null) as EnergyConsumption | null,
    energyConsumptionAt: row.buildingDpeDateAt
      ? new Date(row.buildingDpeDateAt)
      : null,
    geoPerimeters: row.geoPerimeters
  };
}

interface StreamOptions {
  filters?: HousingFiltersApi;
  includes?: HousingInclude[];
}

function stream(opts?: StreamOptions): ReadableStream<HousingApi> {
  const query = pipe(
    kysely.selectFrom('fastHousing').selectAll('fastHousing'),
    filterQuery(opts?.filters ?? {}),
    includeQuery(opts?.includes),
    sortQuery()
  );
  return ReadableStream.from(query.stream()).pipeThrough(
    map(parseHousingRowNext)
  );
}

export interface CountOptions {
  filters?: HousingFiltersApi;
  groupBy?: 'status';
}

function count(
  options?: CountOptions & { groupBy?: undefined }
): Promise<HousingCountApi>;
function count(
  options: CountOptions & { groupBy: 'status' }
): Promise<Record<HousingStatus, HousingCountApi>>;
async function count(
  options?: CountOptions
): Promise<HousingCountApi | Record<HousingStatus, HousingCountApi>> {
  logger.debug('Count housing', options?.filters);

  const filters = options?.filters ?? {};

  const query = pipe(
    kysely.selectFrom('fastHousing'),
    filterQuery(filters),
    (query) =>
      query.leftJoin('ownersHousing', (join) =>
        join
          .onRef('ownersHousing.housingGeoCode', '=', 'fastHousing.geoCode')
          .onRef('ownersHousing.housingId', '=', 'fastHousing.id')
          .on('ownersHousing.rank', '=', 1)
      )
  );

  if (options?.groupBy === 'status') {
    const rows = await query
      .select([
        'fastHousing.status',
        sql<string>`count(fast_housing.id)`.as('housing'),
        sql<string>`count(distinct owners_housing.owner_id)`.as('owners')
      ])
      .groupBy('fastHousing.status')
      .execute();

    // Merge actual counts over a zero-filled base so the result is
    // exhaustive over the status enum
    const zeros = Record.fromIterableWith(
      HOUSING_STATUS_VALUES,
      (status): [string, HousingCountApi] => [
        String(status),
        { housing: 0, owners: 0 }
      ]
    );
    const counted = Record.fromIterableWith(
      rows,
      (row): [string, HousingCountApi] => [
        String(row.status),
        { housing: Number(row.housing), owners: Number(row.owners) }
      ]
    );
    return Record.union(zeros, counted, (_zeros, actual) => actual) as Record<
      HousingStatus,
      HousingCountApi
    >;
  }

  const counts = await query
    .select([
      sql<string>`count(fast_housing.id)`.as('housing'),
      sql<string>`count(distinct owners_housing.owner_id)`.as('owners')
    ])
    .executeTakeFirstOrThrow();
  return {
    housing: Number(counts.housing),
    owners: Number(counts.owners)
  };
}

interface FindOneOptions {
  /**
   * Required if you want to restrict
   * the housing’s campaigns to a specific establishment.
   * Otherwise, all campaigns will be included.
   */
  establishment?: EstablishmentApi['id'];
  geoCode: string[];
  id?: string;
  localId?: string;
  includes?: HousingInclude[];
}

async function findOne(opts: FindOneOptions): Promise<HousingApi | null> {
  const establishmentIds = opts.establishment
    ? [opts.establishment]
    : undefined;
  const row = await pipe(
    kysely.selectFrom('fastHousing').selectAll('fastHousing'),
    filterQuery({ localities: opts.geoCode, establishmentIds }),
    includeQuery(opts.includes, establishmentIds),
    (query) => (opts.id ? query.where('fastHousing.id', '=', opts.id) : query),
    (query) =>
      opts.localId
        ? query.where('fastHousing.localId', '=', opts.localId)
        : query
  ).executeTakeFirst();

  return row ? parseHousingRowNext(row as HousingRowNext) : null;
}

interface SaveOptions {
  /**
   * @default 'ignore'
   */
  onConflict?: 'merge' | 'ignore';
  /**
   * @default '*' (all fields)
   */
  merge?: Array<keyof HousingRecordDBO>;
}

async function save(
  housing: HousingRecordApi,
  opts?: SaveOptions
): Promise<void> {
  logger.debug('Saving housing...', { housing });
  await saveMany([housing], opts);
  logger.info(`Housing saved.`, { housing: housing.id });
}

/**
 * Create housing records if they don't exist.
 * Update **all fields** otherwise.
 * @param housingList
 * @param opts
 */
async function saveMany(
  housingList: HousingRecordApi[],
  opts?: SaveOptions
): Promise<void> {
  if (housingList.length === 0) {
    logger.debug('No housing to save. Skipping...');
    return;
  }

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('fastHousing')
      .values(housingList.map(toHousingInsert))
      .onConflict((oc) => {
        const conflict = oc.columns(['geoCode', 'localId']);
        if (opts?.onConflict !== 'merge') {
          return conflict.doNothing();
        }
        const columns = housingMergeColumns(opts?.merge);
        // An explicit empty merge list means "update nothing on conflict".
        if (columns.length === 0) {
          return conflict.doNothing();
        }
        return conflict.doUpdateSet((eb: any) =>
          Object.fromEntries(
            columns.map((column) => [column, eb.ref(`excluded.${column}`)])
          )
        );
      })
      .execute();
  });
}

type HousingInclude =
  | 'owner'
  | 'campaigns'
  | 'perimeters'
  | 'precisions'
  | 'buildings';

// Camel-case Insertable mirror of formatHousingRecordApi for the Kysely write
// path. plot_area/occupancy_history are READ_ONLY (nullable, no default): set
// null to satisfy Insertable, matching the NULL the Knex path produced by
// omitting them. last_mutation_type is Generated and stays omitted.
export function toHousingInsert(
  housing: HousingRecordApi
): Insertable<DB['fastHousing']> {
  return {
    id: housing.id,
    invariant: housing.invariant,
    localId: housing.localId,
    plotId: housing.plotId,
    buildingId: housing.buildingId,
    buildingGroupId: housing.buildingGroupId,
    buildingLocation: housing.buildingLocation,
    buildingYear: housing.buildingYear,
    addressDgfip: housing.rawAddress,
    longitudeDgfip: housing.longitude,
    latitudeDgfip: housing.latitude,
    rentalValue: housing.rentalValue,
    beneficiaryCount: housing.beneficiaryCount,
    // geolocation is a PostGIS geometry column (typed `string` by codegen); the
    // API carries a GeoJSON Point, passed through exactly as the Knex path did.
    geolocation: housing.geolocation as unknown as string | null,
    geoCode: housing.geoCode,
    cadastralClassification: housing.cadastralClassification,
    uncomfortable: housing.uncomfortable,
    vacancyStartYear: housing.vacancyStartYear,
    housingKind: housing.housingKind,
    roomsCount: housing.roomsCount,
    livingArea: housing.livingArea,
    cadastralReference: housing.cadastralReference,
    taxed: housing.taxed,
    condominium: housing.ownershipKind,
    dataYears: housing.dataYears,
    dataFileYears: housing.dataFileYears,
    status: housing.status,
    subStatus: housing.subStatus ?? null,
    actualDpe: housing.actualEnergyConsumption,
    energyConsumptionBdnb: housing.energyConsumption,
    energyConsumptionAtBdnb: housing.energyConsumptionAt,
    occupancy: housing.occupancy,
    occupancySource: housing.occupancyRegistered,
    occupancyIntended: housing.occupancyIntended ?? null,
    dataSource: housing.source,
    mutationDate: null,
    lastMutationDate: housing.lastMutationDate
      ? new Date(housing.lastMutationDate)
      : null,
    lastTransactionDate: housing.lastTransactionDate
      ? new Date(housing.lastTransactionDate)
      : null,
    lastTransactionValue: housing.lastTransactionValue,
    geolocationSource: null,
    plotArea: null,
    occupancyHistory: null
  };
}

// Reproduces Knex `.merge(columns)` for Kysely: returns the camelCase columns to
// update on conflict. Callers pass snake_case columns (keyof HousingRecordDBO);
// `undefined` means "merge all inserted fields" and an empty array means none.
// The conflict-key columns are always excluded (updating them to excluded.* is a
// no-op), and so are the READ_ONLY plotArea/occupancyHistory: toHousingInsert
// forces those to null, so merging them would wipe LOVAC-imported values — the
// Knex path omitted them via `Omit<HousingRecordDBO, READ_ONLY_FIELDS>`.
const HOUSING_NON_MERGEABLE_COLUMNS = [
  'geoCode',
  'localId',
  'plotArea',
  'occupancyHistory'
];
function housingMergeColumns(merge?: Array<keyof HousingRecordDBO>): string[] {
  const columns =
    merge !== undefined
      ? merge.map((column) => snakeToCamel(column as string))
      : Object.keys(toHousingInsert({} as HousingRecordApi));
  return columns.filter(
    (column) => !HOUSING_NON_MERGEABLE_COLUMNS.includes(column)
  );
}


async function update(housing: HousingApi): Promise<void> {
  logger.debug('Update housing', housing.id);

  await withinKyselyTransaction(async (trx) => {
    await trx
      .updateTable('fastHousing')
      // Use the index on the partitioned table
      .where('geoCode', '=', housing.geoCode)
      .where('id', '=', housing.id)
      .set({
        occupancy: housing.occupancy,
        occupancyIntended: housing.occupancyIntended ?? null,
        status: housing.status,
        subStatus: housing.subStatus ?? null,
        actualDpe: housing.actualEnergyConsumption
      })
      .execute();
  });
}

async function updateMany(
  housings: ReadonlyArray<HousingId>,
  payload: Partial<
    Pick<HousingApi, 'status' | 'subStatus' | 'occupancy' | 'occupancyIntended'>
  >,
  opts?: {
    /**
     * Only update rows whose current status still matches this value.
     * Makes the write an atomic conditional transition instead of a blind
     * overwrite, so a stale caller-held snapshot cannot clobber a status
     * change committed by a concurrent writer since the caller last read it.
     */
    onlyIfStatus?: HousingStatus;
  }
): Promise<ReadonlyArray<HousingId>> {
  if (housings.length === 0) {
    logger.debug('No housing to update. Skipping...');
    return [];
  }

  const fields = compactUndefined({
    status: payload.status,
    subStatus: payload.subStatus,
    occupancy: payload.occupancy,
    occupancyIntended: payload.occupancyIntended
  });
  if (Object.keys(fields).length === 0) {
    logger.debug('No fields to update. Skipping...');
    return [];
  }

  logger.debug('Updating many housings...', {
    housings: housings.length,
    payload
  });
  return withinKyselyTransaction(async (trx) => {
    let query = trx
      .updateTable('fastHousing')
      .where((eb) =>
        eb.or(
          housings.map((housing) =>
            eb.and([
              eb('geoCode', '=', housing.geoCode),
              eb('id', '=', housing.id)
            ])
          )
        )
      )
      .set(fields);

    if (opts?.onlyIfStatus !== undefined) {
      query = query.where('status', '=', opts.onlyIfStatus);
    }

    const updated = await query.returning(['geoCode', 'id']).execute();
    return updated.map((row) => ({ geoCode: row.geoCode, id: row.id }));
  });
}

async function remove(housing: HousingApi): Promise<void> {
  const info = Struct.pick(housing, 'geoCode', 'id', 'localId');
  logger.debug('Removing housing...', info);
  await kysely
    .deleteFrom('fastHousing')
    .where('geoCode', '=', housing.geoCode)
    .where('id', '=', housing.id)
    .execute();
  logger.info('Removed housing.', info);
}

export interface HousingRecordDBO {
  id: string;
  invariant: string;
  local_id: string;
  building_id: string | null;
  address_dgfip: string[];
  geo_code: string;
  longitude_dgfip: number | null;
  latitude_dgfip: number | null;
  cadastral_classification: CadastralClassification | null;
  uncomfortable: boolean;
  vacancy_start_year: number | null;
  housing_kind: HousingKind;
  rooms_count: number | null;
  living_area: number | null;
  cadastral_reference: string | null;
  building_year: number | null;
  mutation_date: Date | string | null;
  taxed: boolean | null;
  /**
   * @deprecated See {@link data_file_years}
   */
  data_years: number[];
  beneficiary_count: number | null;
  building_location: string | null;
  rental_value: number | null;
  condominium: string | null;
  status: HousingStatus;
  sub_status: string | null;
  actual_dpe: EnergyConsumption | null;
  /**
   * @deprecated Use `BuildingDBO.dpe_class` instead.
   */
  energy_consumption_bdnb: EnergyConsumption | null;
  /**
   * @deprecated Use `BuildingDBO.dpe_date_at` instead.
   */
  energy_consumption_at_bdnb: Date | string | null;
  occupancy_source: Occupancy;
  occupancy: Occupancy;
  occupancy_intended: Occupancy | null;
  plot_id: string | null;
  building_group_id: string | null;
  data_source: HousingSource | null;
  /**
   * @example ['ff-2023', 'lovac-2024']
   */
  data_file_years: DataFileYear[] | null;
  geolocation: Point | null;
  geolocation_source: string | null;
  plot_area: number | null;
  last_mutation_date: Date | string | null;
  last_transaction_date: Date | string | null;
  last_transaction_value: number | null;
  occupancy_history: string | null;
  readonly last_mutation_type: Mutation['type'] | null;
}

export interface HousingDBO extends HousingRecordDBO {
  housing_count?: number;
  vacant_housing_count?: number;
  owner_id: string;
  owner_birth_date?: Date;
  owner?: OwnerDBO | null;
  owner_ban_address?: AddressDBO;
  locality_kind?: string;
  geo_perimeters?: string[];
  campaign_ids?: string[];
  contact_count?: number;
  precisions?: Precision[];
  locprop_relative_ban?: number | null;
  // Only populated when 'buildings' include is used
  building_class_dpe?: EnergyConsumption | null;
  building_dpe_date_at?: Date | string | null;
  // TODO: fix and fill this type
}

export const parseHousingRecordApi = (
  housing: HousingRecordDBO
): HousingRecordApi => ({
  id: housing.id,
  invariant: housing.invariant,
  localId: housing.local_id,
  plotId: housing.plot_id,
  plotArea: housing.plot_area,
  buildingGroupId: housing.building_group_id,
  buildingId: housing.building_id,
  buildingYear: housing.building_year,
  buildingLocation: housing.building_location,
  rawAddress: housing.address_dgfip,
  longitude: housing.longitude_dgfip,
  latitude: housing.latitude_dgfip,
  geoCode: housing.geo_code,
  geolocation: housing.geolocation,
  cadastralClassification: housing.cadastral_classification,
  uncomfortable: housing.uncomfortable,
  vacancyStartYear: housing.vacancy_start_year,
  housingKind: housing.housing_kind,
  roomsCount: housing.rooms_count,
  livingArea: housing.living_area,
  cadastralReference: housing.cadastral_reference,
  beneficiaryCount: housing.beneficiary_count,
  rentalValue: housing.rental_value,
  taxed: housing.taxed,
  ownershipKind: housing.condominium,
  dataYears: housing.data_years,
  dataFileYears: housing.data_file_years ?? [],
  source: housing.data_source,
  status: housing.status,
  subStatus: housing.sub_status,
  actualEnergyConsumption: housing.actual_dpe,
  energyConsumption: housing.energy_consumption_bdnb,
  energyConsumptionAt: housing.energy_consumption_at_bdnb
    ? new Date(housing.energy_consumption_at_bdnb)
    : null,
  occupancy: housing.occupancy,
  occupancyRegistered: housing.occupancy_source,
  occupancyIntended: housing.occupancy_intended,
  lastMutationType: housing.last_mutation_type,
  lastMutationDate: housing.last_mutation_date
    ? new Date(housing.last_mutation_date).toJSON()
    : null,
  lastTransactionDate: housing.last_transaction_date
    ? new Date(housing.last_transaction_date).toJSON()
    : null,
  lastTransactionValue: housing.last_transaction_value
});

/**
 * Camel-case Kysely mirror of {@link parseHousingRecordApi}. Reads the plain
 * fast_housing record columns (no joined includes) from a Kysely row and is
 * used by the housingOwner read path (findByOwner).
 */
export type HousingRecordRow = Selectable<DB['fastHousing']>;

export const parseHousingRecordRow = (
  row: HousingRecordRow
): HousingRecordApi => ({
  id: row.id,
  invariant: row.invariant,
  localId: row.localId,
  plotId: row.plotId,
  plotArea: row.plotArea,
  buildingGroupId: row.buildingGroupId,
  buildingId: row.buildingId,
  buildingYear: row.buildingYear,
  buildingLocation: row.buildingLocation,
  rawAddress: row.addressDgfip,
  longitude: row.longitudeDgfip,
  latitude: row.latitudeDgfip,
  geoCode: row.geoCode,
  geolocation: row.geolocation as unknown as Point | null,
  cadastralClassification:
    row.cadastralClassification as CadastralClassification | null,
  uncomfortable: row.uncomfortable,
  vacancyStartYear: row.vacancyStartYear,
  housingKind: row.housingKind as HousingKind,
  roomsCount: row.roomsCount,
  livingArea: row.livingArea,
  cadastralReference: row.cadastralReference,
  beneficiaryCount: row.beneficiaryCount,
  rentalValue: row.rentalValue,
  taxed: row.taxed,
  ownershipKind: row.condominium,
  dataYears: row.dataYears,
  dataFileYears: (row.dataFileYears ?? []) as DataFileYear[],
  source: row.dataSource as HousingSource | null,
  status: row.status as HousingStatus,
  subStatus: row.subStatus,
  actualEnergyConsumption: row.actualDpe as EnergyConsumption | null,
  energyConsumption: row.energyConsumptionBdnb as EnergyConsumption | null,
  energyConsumptionAt: row.energyConsumptionAtBdnb
    ? new Date(row.energyConsumptionAtBdnb)
    : null,
  occupancy: row.occupancy as Occupancy,
  occupancyRegistered: row.occupancySource as Occupancy,
  occupancyIntended: row.occupancyIntended as Occupancy | null,
  lastMutationType: row.lastMutationType as Mutation['type'] | null,
  lastMutationDate: row.lastMutationDate
    ? new Date(row.lastMutationDate).toJSON()
    : null,
  lastTransactionDate: row.lastTransactionDate
    ? new Date(row.lastTransactionDate).toJSON()
    : null,
  lastTransactionValue: row.lastTransactionValue
});

// ---------------------------------------------------------------------------
// Kysely read layer (find/findOne/stream/count). Mirrors the Knex builders
// below; the Knex query surface is kept for seeds/LOVAC/still-Knex callers.
// The joined query is raw-SQL-heavy (lateral aggregates, geo/text filters),
// so the builders are `any`-typed — behaviour is pinned by the characterization
// tests, not the compiler.
// ---------------------------------------------------------------------------


function filterQuery(filters: HousingFiltersApi) {
  return <O>(query: SelectQueryBuilder<DB, 'fastHousing', O>) => {
    // Correlated EXISTS on the rank-1 owner (owners_housing ⋈ owners). Owner
    // filters go through a subquery instead of a top-level join, so the query
    // type (`O`/`'fastHousing'`) stays stable across the whole pipe.
    const primaryOwnerExists = (
      eb: ExpressionBuilder<DB, 'fastHousing'>,
      predicate: (
        owner: ExpressionBuilder<DB, 'ownersHousing' | 'owners'>
      ) => Expression<SqlBool>
    ): Expression<SqlBool> =>
      eb.exists(
        eb
          .selectFrom('ownersHousing')
          .innerJoin('owners', 'owners.id', 'ownersHousing.ownerId')
          .whereRef('ownersHousing.housingGeoCode', '=', 'fastHousing.geoCode')
          .whereRef('ownersHousing.housingId', '=', 'fastHousing.id')
          .where('ownersHousing.rank', '=', 1)
          .where(predicate)
          .select('owners.id')
      );

    if (filters.housingIds?.length) {
      query = query.where(
        'fastHousing.id',
        filters.all ? 'not in' : 'in',
        filters.housingIds
      );
    }

    if (filters.occupancies?.length) {
      query = pipe(
        filters.occupancies ?? [],
        Array.intersection(READ_WRITE_OCCUPANCY_VALUES),
        (occupancies) =>
          filters.occupancies?.includes(Occupancy.OTHERS)
            ? occupancies.concat(READ_ONLY_OCCUPANCY_VALUES)
            : occupancies,
        (occupancies) =>
          occupancies.length > 0
            ? query.where('fastHousing.occupancy', 'in', occupancies)
            : query
      );
    }

    if (filters.energyConsumption?.length) {
      query = query.where(({ exists, selectFrom, or }) => {
        const exprs: Expression<SqlBool>[] = [];

        if (filters.energyConsumption?.includes(null)) {
          exprs.push(
            exists(
              selectFrom('buildings')
                .select('buildings.id')
                .whereRef('buildings.id', '=', 'fastHousing.buildingId')
                .where('buildings.classDpe', 'is', null)
            )
          );
        }

        const energyConsumptions = filters.energyConsumption?.filter(
          Predicate.isNotNull
        );
        if (energyConsumptions?.length) {
          exprs.push(
            exists(
              selectFrom('buildings')
                .select('buildings.id')
                .whereRef('buildings.id', '=', 'fastHousing.buildingId')
                .where('buildings.classDpe', 'in', energyConsumptions)
            )
          );
        }

        return or(exprs);
      });
    }

    if (filters.groupIds?.length) {
      query = query.where(({ exists, selectFrom }) => {
        return exists(
          selectFrom('groupsHousing')
            .whereRef(
              'fastHousing.geoCode',
              '=',
              'groupsHousing.housingGeoCode'
            )
            .whereRef('fastHousing.id', '=', 'groupsHousing.housingId')
            .where('groupsHousing.groupId', 'in', filters.groupIds!)
            .innerJoin('groups', 'groupsHousing.groupId', 'groups.id')
            .$if(
              !!filters.establishmentIds && filters.establishmentIds.length > 0,
              (qb) =>
                qb.where(
                  'groups.establishmentId',
                  'in',
                  filters.establishmentIds ?? []
                )
            )
            .select('groups.id')
        );
      });
    }

    if (filters.campaignIds?.length) {
      const campaignIds = filters.campaignIds.filter(Predicate.isNotNull);
      query = query.where((eb) => {
        const arms: Expression<SqlBool>[] = [];
        if (filters.campaignIds?.includes(null)) {
          arms.push(
            eb.not(
              eb.exists(
                eb
                  .selectFrom('campaignsHousing')
                  .whereRef(
                    'campaignsHousing.housingGeoCode',
                    '=',
                    'fastHousing.geoCode'
                  )
                  .whereRef('campaignsHousing.housingId', '=', 'fastHousing.id')
                  .select('campaignsHousing.campaignId')
              )
            )
          );
        }
        if (campaignIds.length) {
          arms.push(
            eb.exists(
              eb
                .selectFrom('campaignsHousing')
                .whereRef(
                  'campaignsHousing.housingGeoCode',
                  '=',
                  'fastHousing.geoCode'
                )
                .whereRef('campaignsHousing.housingId', '=', 'fastHousing.id')
                .where('campaignsHousing.campaignId', 'in', campaignIds)
                .select('campaignsHousing.campaignId')
            )
          );
        }
        return eb.or(arms);
      });
    }

    if (filters.campaignCount !== undefined) {
      const establishmentIds = filters.establishmentIds;
      const scope = establishmentIds?.length
        ? sql`inner join campaigns on campaigns.id = campaigns_housing.campaign_id`
        : sql``;
      const establishmentFilter = establishmentIds?.length
        ? sql`and campaigns.establishment_id = any(${sql.val(establishmentIds)})`
        : sql``;
      query = query.where(
        sql<SqlBool>`(
          select count(distinct campaigns_housing.campaign_id)
          from campaigns_housing ${scope}
          where campaigns_housing.housing_geo_code = fast_housing.geo_code
            and campaigns_housing.housing_id = fast_housing.id
            ${establishmentFilter}
        ) = ${filters.campaignCount}`
      );
    }

    if (filters.ownerIds?.length) {
      query = query.where((eb) =>
        primaryOwnerExists(eb, (owner) =>
          owner('owners.id', 'in', filters.ownerIds!)
        )
      );
    }

    if (filters.ownerKinds?.length) {
      query = query.where((eb) =>
        primaryOwnerExists(eb, (owner) => {
          const arms: Expression<SqlBool>[] = [];
          if (filters.ownerKinds?.includes(null)) {
            arms.push(owner('owners.kindClass', 'is', null));
          }
          const kinds = filters.ownerKinds
            ?.filter(isNotNull)
            .map((kind) => OWNER_KIND_LABELS[kind]);
          if (kinds?.length) {
            arms.push(owner('owners.kindClass', 'in', kinds));
          }
          return owner.or(arms);
        })
      );
    }

    if (filters.ownerAges?.length) {
      query = query.where((eb) =>
        primaryOwnerExists(eb, (owner) => {
          const arms: Expression<SqlBool>[] = [];
          if (filters.ownerAges?.includes(null)) {
            arms.push(owner('owners.birthDate', 'is', null));
          }
          if (filters.ownerAges?.includes('lt40')) {
            arms.push(
              sql<SqlBool>`extract(year from age(owners.birth_date)) < 40`
            );
          }
          if (filters.ownerAges?.includes('40to59')) {
            arms.push(
              sql<SqlBool>`extract(year from age(owners.birth_date)) between 40 and 59`
            );
          }
          if (filters.ownerAges?.includes('60to74')) {
            arms.push(
              sql<SqlBool>`extract(year from age(owners.birth_date)) between 60 and 74`
            );
          }
          if (filters.ownerAges?.includes('75to99')) {
            arms.push(
              sql<SqlBool>`extract(year from age(owners.birth_date)) between 75 and 99`
            );
          }
          if (filters.ownerAges?.includes('gte100')) {
            arms.push(
              sql<SqlBool>`extract(year from age(owners.birth_date)) >= 100`
            );
          }
          return owner.or(arms);
        })
      );
    }

    if (filters.relativeLocations?.length) {
      const numericValues = filters.relativeLocations.flatMap(
        relativeLocationFilterToDBO
      );
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('ownersHousing')
            .whereRef('ownersHousing.housingId', '=', 'fastHousing.id')
            .whereRef(
              'ownersHousing.housingGeoCode',
              '=',
              'fastHousing.geoCode'
            )
            .where('ownersHousing.rank', '=', 1)
            .where('ownersHousing.locpropRelativeBan', 'in', numericValues)
            .select('ownersHousing.housingId')
        )
      );
    }

    if (filters.multiOwners?.length) {
      query = query.where((eb) =>
        primaryOwnerExists(eb, (owner) => {
          const arms: Expression<SqlBool>[] = [];
          if (filters.multiOwners?.includes(true)) {
            arms.push(owner('owners.isMultiOwner', '=', true));
          }
          if (filters.multiOwners?.includes(false)) {
            arms.push(owner('owners.isMultiOwner', '=', false));
          }
          return owner.or(arms);
        })
      );
    }

    if (filters.precisions?.length) {
      query = query.where('fastHousing.id', 'in', (eb) =>
        eb
          .selectFrom('housingPrecisions')
          .where('housingPrecisions.precisionId', 'in', filters.precisions!)
          .select('housingPrecisions.housingId')
      );
    }

    if (filters.beneficiaryCounts?.length) {
      const counts = filters.beneficiaryCounts
        .map(Number)
        .filter((count) => !Number.isNaN(count) && count > 0);
      const hasGte5 = filters.beneficiaryCounts.includes('gte5');
      const hasZero = filters.beneficiaryCounts.includes('0');
      query = query.where((eb) => {
        const arms: Expression<SqlBool>[] = [];
        if (counts.length || hasGte5) {
          arms.push(
            eb.exists(
              eb
                .selectFrom('ownersHousing')
                .whereRef(
                  'ownersHousing.housingGeoCode',
                  '=',
                  'fastHousing.geoCode'
                )
                .whereRef('ownersHousing.housingId', '=', 'fastHousing.id')
                .where('ownersHousing.rank', '>=', 1)
                .groupBy([
                  'ownersHousing.housingGeoCode',
                  'ownersHousing.housingId'
                ])
                .$call((qb) =>
                  counts.length && hasGte5
                    ? qb.having(
                        sql<SqlBool>`count(*) in (${sql.join(counts)}) or count(*) >= 5`
                      )
                    : counts.length
                      ? qb.having(
                          sql<SqlBool>`count(*) in (${sql.join(counts)})`
                        )
                      : qb.having(sql<SqlBool>`count(*) >= 5`)
                )
                .select('ownersHousing.housingId')
            )
          );
        }
        if (hasZero) {
          arms.push(
            eb.not(
              eb.exists(
                eb
                  .selectFrom('ownersHousing')
                  .whereRef(
                    'ownersHousing.housingGeoCode',
                    '=',
                    'fastHousing.geoCode'
                  )
                  .whereRef('ownersHousing.housingId', '=', 'fastHousing.id')
                  .where('ownersHousing.rank', '>=', 1)
                  .select('ownersHousing.housingId')
              )
            )
          );
        }
        return eb.or(arms);
      });
    }

    if (filters.housingKinds?.length) {
      query = query.where(
        'fastHousing.housingKind',
        'in',
        filters.housingKinds
      );
    }

    if (filters.housingAreas?.length) {
      query = query.where((eb) =>
        eb.or([
          ...(filters.housingAreas?.includes('lt35')
            ? [eb.between('fastHousing.livingArea', 0, 34)]
            : []),
          ...(filters.housingAreas?.includes('35to74')
            ? [eb.between('fastHousing.livingArea', 35, 74)]
            : []),
          ...(filters.housingAreas?.includes('75to99')
            ? [eb.between('fastHousing.livingArea', 75, 99)]
            : []),
          ...(filters.housingAreas?.includes('gte100')
            ? [eb('fastHousing.livingArea', '>=', 100)]
            : [])
        ])
      );
    }

    if (filters.roomsCounts?.length) {
      const roomCounts = filters.roomsCounts
        .map(Number)
        .filter((count) => !Number.isNaN(count));
      query = query.where((eb) =>
        eb.or([
          ...(filters.roomsCounts?.includes('gte5')
            ? [eb('fastHousing.roomsCount', '>=', 5)]
            : []),
          ...(roomCounts.length
            ? [eb('fastHousing.roomsCount', 'in', roomCounts)]
            : [])
        ])
      );
    }

    if (filters.cadastralClassifications?.length) {
      query = query.where((eb) => {
        const arms: Expression<SqlBool>[] = [];
        if (filters.cadastralClassifications?.includes(null)) {
          arms.push(eb('fastHousing.cadastralClassification', 'is', null));
        }
        const values = filters.cadastralClassifications?.filter(isNotNull);
        if (values?.length) {
          arms.push(eb('fastHousing.cadastralClassification', 'in', values));
        }
        return eb.or(arms);
      });
    }

    if (filters.buildingPeriods?.length) {
      query = query.where((eb) =>
        eb.or([
          ...(filters.buildingPeriods?.includes('lt1919')
            ? [eb.between('fastHousing.buildingYear', 0, 1918)]
            : []),
          ...(filters.buildingPeriods?.includes('1919to1945')
            ? [eb.between('fastHousing.buildingYear', 1919, 1945)]
            : []),
          ...(filters.buildingPeriods?.includes('1946to1990')
            ? [eb.between('fastHousing.buildingYear', 1946, 1990)]
            : []),
          ...(filters.buildingPeriods?.includes('gte1991')
            ? [eb('fastHousing.buildingYear', '>=', 1991)]
            : [])
        ])
      );
    }

    if (filters.vacancyYears?.length) {
      query = query.where((eb) => {
        const arms: Expression<SqlBool>[] = [];
        const equals = (year: number) =>
          eb('fastHousing.vacancyStartYear', '=', year);
        if (filters.vacancyYears?.includes('2023')) arms.push(equals(2023));
        if (filters.vacancyYears?.includes('2022')) arms.push(equals(2022));
        if (filters.vacancyYears?.includes('2021')) arms.push(equals(2021));
        if (filters.vacancyYears?.includes('2020')) arms.push(equals(2020));
        if (filters.vacancyYears?.includes('2019')) arms.push(equals(2019));
        if (filters.vacancyYears?.includes('2018to2015')) {
          arms.push(eb.between('fastHousing.vacancyStartYear', 2015, 2018));
        }
        if (filters.vacancyYears?.includes('2014to2010')) {
          arms.push(eb.between('fastHousing.vacancyStartYear', 2010, 2014));
        }
        if (filters.vacancyYears?.includes('before2010')) {
          arms.push(eb('fastHousing.vacancyStartYear', '<', 2010));
        }
        if (filters.vacancyYears?.includes('missingData')) {
          arms.push(eb('fastHousing.vacancyStartYear', 'is', null));
        }
        return eb.or(arms);
      });
    }

    if (filters.isTaxedValues?.length) {
      query = query.where((eb) => {
        const arms: Expression<SqlBool>[] = [];
        if (filters.isTaxedValues?.includes(true)) {
          arms.push(sql<SqlBool>`fast_housing.taxed`);
        }
        if (filters.isTaxedValues?.includes(false)) {
          arms.push(eb('fastHousing.taxed', 'is', null));
          arms.push(sql<SqlBool>`not(fast_housing.taxed)`);
        }
        return eb.or(arms);
      });
    }

    if (filters.ownershipKinds?.length) {
      query = query.where((eb) => {
        const arms: Expression<SqlBool>[] = [];
        if (filters.ownershipKinds?.includes('single')) {
          arms.push(
            eb.or([
              eb('fastHousing.condominium', 'is', null),
              eb(
                'fastHousing.condominium',
                'in',
                INTERNAL_MONO_CONDOMINIUM_VALUES
              )
            ])
          );
        }
        if (filters.ownershipKinds?.includes('co')) {
          arms.push(
            eb('fastHousing.condominium', 'in', INTERNAL_CO_CONDOMINIUM_VALUES)
          );
        }
        if (filters.ownershipKinds?.includes('other')) {
          arms.push(
            eb.and([
              eb('fastHousing.condominium', 'is not', null),
              eb('fastHousing.condominium', 'not in', [
                ...INTERNAL_MONO_CONDOMINIUM_VALUES,
                ...INTERNAL_CO_CONDOMINIUM_VALUES
              ])
            ])
          );
        }
        return eb.or(arms);
      });
    }

    if (filters.housingCounts?.length) {
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('buildings')
            .whereRef('buildings.id', '=', 'fastHousing.buildingId')
            .where((building) =>
              building.or([
                ...(filters.housingCounts?.includes('lt5')
                  ? [
                      sql<SqlBool>`coalesce(buildings.housing_count, 0) between 0 and 4`
                    ]
                  : []),
                ...(filters.housingCounts?.includes('5to19')
                  ? [building.between('buildings.housingCount', 5, 19)]
                  : []),
                ...(filters.housingCounts?.includes('20to49')
                  ? [building.between('buildings.housingCount', 20, 49)]
                  : []),
                ...(filters.housingCounts?.includes('gte50')
                  ? [sql<SqlBool>`buildings.housing_count >= 50`]
                  : [])
              ])
            )
            .select('buildings.id')
        )
      );
    }

    if (filters.vacancyRates?.length) {
      const rate = sql`buildings.housing_count > 0 and buildings.vacant_housing_count * 100.0 / buildings.housing_count`;
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('buildings')
            .whereRef('buildings.id', '=', 'fastHousing.buildingId')
            .where((building) =>
              building.or([
                ...(filters.vacancyRates?.includes('lt20')
                  ? [sql<SqlBool>`${rate} < 20`]
                  : []),
                ...(filters.vacancyRates?.includes('20to39')
                  ? [sql<SqlBool>`${rate} between 20 and 39`]
                  : []),
                ...(filters.vacancyRates?.includes('40to59')
                  ? [sql<SqlBool>`${rate} between 40 and 59`]
                  : []),
                ...(filters.vacancyRates?.includes('60to79')
                  ? [sql<SqlBool>`${rate} between 60 and 79`]
                  : []),
                ...(filters.vacancyRates?.includes('gte80')
                  ? [sql<SqlBool>`${rate} >= 80`]
                  : [])
              ])
            )
            .select('buildings.id')
        )
      );
    }

    if (filters.departments?.length) {
      query = query.where((eb) =>
        eb.or(
          filters.departments!.map(
            (department) =>
              sql<SqlBool>`left(fast_housing.geo_code, ${department.length}) = ${department}`
          )
        )
      );
    }

    // `undefined` => no geo filter; `[]` => match nothing (`in ()` becomes a
    // false predicate via the HandleEmptyInListsPlugin).
    if (filters.localities !== undefined) {
      query = query.where('fastHousing.geoCode', 'in', filters.localities);
    }

    if (filters.localityKinds?.length) {
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('localities')
            .whereRef('localities.geoCode', '=', 'fastHousing.geoCode')
            .where((locality) =>
              locality.or([
                ...(filters.localityKinds?.includes(null)
                  ? [locality('localities.localityKind', 'is', null)]
                  : []),
                ...(() => {
                  const kinds = filters.localityKinds?.filter(isNotNull);
                  return kinds?.length
                    ? [locality('localities.localityKind', 'in', kinds)]
                    : [];
                })()
              ])
            )
            .select('localities.geoCode')
        )
      );
    }

    if (filters.geoPerimetersIncluded?.length) {
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('geoPerimeters')
            .where('geoPerimeters.kind', 'in', filters.geoPerimetersIncluded!)
            .where(
              sql<SqlBool>`st_contains(geo_perimeters.geom, st_setsrid(st_point(fast_housing.longitude_dgfip, fast_housing.latitude_dgfip), 4326))`
            )
            .select('geoPerimeters.id')
        )
      );
    }

    if (filters.geoPerimetersExcluded?.length) {
      query = query.where((eb) =>
        eb.not(
          eb.exists(
            eb
              .selectFrom('geoPerimeters')
              .where('geoPerimeters.kind', 'in', filters.geoPerimetersExcluded!)
              .where(
                sql<SqlBool>`st_contains(geo_perimeters.geom, st_setsrid(st_point(fast_housing.longitude_dgfip, fast_housing.latitude_dgfip), 4326))`
              )
              .select('geoPerimeters.id')
          )
        )
      );
    }

    if (filters.dataFileYearsIncluded?.length) {
      query = query.where((eb) => {
        const expressions: Expression<SqlBool>[] = [];

        if (filters.dataFileYearsIncluded?.includes(null)) {
          expressions.push(eb('fastHousing.dataFileYears', 'is', null));
          expressions.push(
            sql<SqlBool>`cardinality(fast_housing.data_file_years) = 0`
          );
        }

        if (filters.dataFileYearsIncluded?.includes('datafoncier-manual')) {
          expressions.push(
            eb('fastHousing.dataSource', '=', 'datafoncier-manual')
          );
        }

        const dataFileYears = filters.dataFileYearsIncluded?.filter(
          (value): value is DataFileYear =>
            Predicate.isNotNull(value) && value !== 'datafoncier-manual'
        );
        if (dataFileYears?.length) {
          expressions.push(
            eb('fastHousing.dataFileYears', '&&', eb.val(dataFileYears))
          );
        }

        return eb.or(expressions);
      });
    }

    if (filters.dataFileYearsExcluded?.length) {
      query = query.where((eb) => {
        const specialArms: Expression<SqlBool>[] = [];
        if (filters.dataFileYearsExcluded?.includes(null)) {
          specialArms.push(
            eb.and([
              eb('fastHousing.dataFileYears', 'is not', null),
              sql<SqlBool>`cardinality(fast_housing.data_file_years) > 0`
            ])
          );
        }
        if (filters.dataFileYearsExcluded?.includes('datafoncier-manual')) {
          specialArms.push(
            eb.or([
              eb('fastHousing.dataSource', 'is', null),
              eb('fastHousing.dataSource', '!=', 'datafoncier-manual')
            ])
          );
        }
        const orArms: Expression<SqlBool>[] = [];
        if (specialArms.length) {
          orArms.push(eb.and(specialArms));
        }
        const dataFileYears = filters.dataFileYearsExcluded?.filter(
          (value): value is DataFileYear =>
            Predicate.isNotNull(value) && value !== 'datafoncier-manual'
        );
        if (dataFileYears?.length) {
          orArms.push(
            sql<SqlBool>`not(fast_housing.data_file_years && ${sql.val(dataFileYears)}::text[])`
          );
        }
        return eb.or(orArms);
      });
    }

    if (filters.statusList?.length) {
      query = query.where('fastHousing.status', 'in', filters.statusList);
    }

    if (filters.status !== undefined) {
      query = query.where('fastHousing.status', '=', filters.status);
    }

    if (filters.subStatus?.length) {
      query = query.where('fastHousing.subStatus', 'in', filters.subStatus);
    }

    if (filters.query?.length) {
      const search = filters.query;
      const reversed = search.split(' ').reverse().join(' ');
      const tokens = search
        .replaceAll(' ', ',')
        .split(',')
        .map((token) => token.trim());
      query = query.where((eb) => {
        const arms: Expression<SqlBool>[] = [];

        // With more than 20 tokens the query is likely neither a name nor an
        // address, so skip the (expensive) fuzzy arms.
        if (search.replaceAll(' ', ',').split(',').length < 20) {
          arms.push(sql<SqlBool>`fast_housing.invariant = ${search}`);
          arms.push(sql<SqlBool>`fast_housing.local_id = ${search}`);
          arms.push(
            primaryOwnerExists(eb, (owner) =>
              owner.or([
                sql<SqlBool>`upper(unaccent(owners.full_name)) like '%' || upper(unaccent(${search})) || '%'`,
                sql<SqlBool>`upper(unaccent(owners.full_name)) like '%' || upper(unaccent(${reversed})) || '%'`,
                sql<SqlBool>`upper(unaccent(owners.administrator)) like '%' || upper(unaccent(${search})) || '%'`,
                sql<SqlBool>`upper(unaccent(owners.administrator)) like '%' || upper(unaccent(${reversed})) || '%'`,
                ...normalizeAddressQuery(search).map(
                  (variation) =>
                    sql<SqlBool>`replace(upper(unaccent(array_to_string(owners.address_dgfip, '%'))), ' ', '') like '%' || replace(upper(unaccent(${variation})), ' ', '') || '%'`
                )
              ])
            )
          );
          for (const variation of normalizeAddressQuery(search)) {
            arms.push(
              sql<SqlBool>`replace(upper(unaccent(array_to_string(fast_housing.address_dgfip, '%'))), ' ', '') like '%' || replace(upper(unaccent(${variation})), ' ', '') || '%'`
            );
          }
        }

        arms.push(eb('fastHousing.invariant', 'in', tokens));
        arms.push(eb('fastHousing.localId', 'in', tokens));
        arms.push(eb('fastHousing.cadastralReference', 'in', tokens));
        return eb.or(arms);
      });
    }

    // lastMutationYears — null branch (no active years required)
    if (filters.lastMutationYears?.includes(null)) {
      query = query.where((eb) =>
        eb.and([
          eb('fastHousing.lastMutationDate', 'is', null),
          eb('fastHousing.lastTransactionDate', 'is', null)
        ])
      );
    }

    // lastMutationYears — main branch (typed year ranges)
    if (filters.lastMutationYears?.length) {
      query = query.where((eb) => {
        const years = (filters.lastMutationYears ?? [])
          .filter(Predicate.isNotNull)
          .flatMap((year) =>
            match(year)
              .returnType<string | ReadonlyArray<string>>()
              .with(Pattern.union('2021', '2022', '2023', '2024'), identity)
              .with('2015to2020', () => [
                '2015',
                '2016',
                '2017',
                '2018',
                '2019',
                '2020'
              ])
              .with('2010to2014', () => [
                '2010',
                '2011',
                '2012',
                '2013',
                '2014'
              ])
              .otherwise(() => [])
          );
        const types: ReadonlyArray<MutationType> = !filters.lastMutationTypes
          ?.length
          ? MUTATION_TYPE_VALUES
          : filters.lastMutationTypes;

        const arms: Expression<SqlBool>[] = [];

        if (types.includes('donation')) {
          const inner: Expression<SqlBool>[] = [];
          if (years.length) {
            inner.push(
              sql<SqlBool>`extract(year from fast_housing.last_mutation_date) = any(${sql.val(years)})`
            );
          }
          if (filters.lastMutationYears?.includes('lte2009')) {
            inner.push(
              sql<SqlBool>`extract(year from fast_housing.last_mutation_date) <= 2009`
            );
          }
          arms.push(
            eb.and([
              eb('fastHousing.lastMutationType', '=', 'donation'),
              ...(inner.length ? [eb.and(inner)] : [])
            ])
          );
        }

        if (types.includes('sale')) {
          const inner: Expression<SqlBool>[] = [];
          if (years.length) {
            inner.push(
              sql<SqlBool>`extract(year from fast_housing.last_transaction_date) = any(${sql.val(years)})`
            );
          }
          if (filters.lastMutationYears?.includes('lte2009')) {
            inner.push(
              sql<SqlBool>`extract(year from fast_housing.last_transaction_date) <= 2009`
            );
          }
          arms.push(
            eb.and([
              eb('fastHousing.lastMutationType', '=', 'sale'),
              ...(inner.length ? [eb.and(inner)] : [])
            ])
          );
        }

        if (types.includes(null)) {
          const inner: Expression<SqlBool>[] = [];
          if (years.length) {
            inner.push(
              sql<SqlBool>`extract(year from fast_housing.last_mutation_date) = any(${sql.val(years)})`
            );
          }
          if (filters.lastMutationYears?.includes('lte2009')) {
            inner.push(
              sql<SqlBool>`extract(year from fast_housing.last_mutation_date) <= 2009`
            );
          }
          if (filters.lastMutationYears?.includes(null)) {
            inner.push(eb('fastHousing.lastMutationDate', 'is', null));
          }
          arms.push(
            eb.and([
              eb('fastHousing.lastMutationType', 'is', null),
              ...(inner.length ? [eb.or(inner)] : [])
            ])
          );
        }

        return eb.or(arms);
      });
    }

    if (filters.lastMutationTypes?.length) {
      query = query.where((eb) => {
        const arms: Expression<SqlBool>[] = [];
        const nonNull =
          filters.lastMutationTypes?.filter(Predicate.isNotNull) ?? [];
        if (nonNull.length) {
          arms.push(eb('fastHousing.lastMutationType', 'in', nonNull));
        }
        if (filters.lastMutationTypes?.includes(null)) {
          arms.push(eb('fastHousing.lastMutationType', 'is', null));
        }
        return eb.or(arms);
      });
    }

    return query;
  };
}

function includeQuery(
  includes: ReadonlyArray<HousingInclude> = [],
  establishmentIds?: Array<EstablishmentApi['id']>
) {
  return <O>(query: SelectQueryBuilder<DB, 'fastHousing', O>) =>
    query
      .$if(includes.includes('owner'), (qb) =>
        qb.select((eb) =>
          primaryOwner({
            housingGeoCode: eb.ref('fastHousing.geoCode'),
            housingId: eb.ref('fastHousing.id')
          }).as('owner')
        )
      )
      .$if(includes.includes('campaigns'), (qb) =>
        qb.select((eb) =>
          campaigns({
            housingGeoCode: eb.ref('fastHousing.geoCode'),
            housingId: eb.ref('fastHousing.id'),
            establishmentIds: establishmentIds?.map((id) => eb.val(id))
          }).as('campaigns')
        )
      )
      .$if(includes.includes('precisions'), (qb) =>
        qb.select((eb) =>
          jsonArrayFrom(
            eb
              .selectFrom('housingPrecisions')
              .whereRef(
                'housingPrecisions.housingGeoCode',
                '=',
                'fastHousing.geoCode'
              )
              .whereRef('housingPrecisions.housingId', '=', 'fastHousing.id')
              .innerJoin(
                'precisions',
                'precisions.id',
                'housingPrecisions.precisionId'
              )
              .selectAll('precisions')
          ).as('precisions')
        )
      )
      .$if(includes.includes('buildings'), (qb) =>
        qb
          .select((eb) =>
            eb
              .selectFrom('buildings')
              .whereRef('buildings.id', '=', 'fastHousing.buildingId')
              .select('buildings.classDpe')
              .as('buildingClassDpe')
          )
          .select((eb) =>
            eb
              .selectFrom('buildings')
              .whereRef('buildings.id', '=', 'fastHousing.buildingId')
              .select('buildings.dpeDateAt')
              .as('buildingDpeDateAt')
          )
      )
      .$if(includes.includes('perimeters'), (qb) =>
        qb.select(
          sql<string[]>`(
            select json_agg(distinct kind)
            from geo_perimeters
            where st_contains(
              geo_perimeters.geom,
              st_setsrid(
                st_point(
                  fast_housing.longitude_dgfip,
                  fast_housing.latitude_dgfip
                ),
                4326
              )
            )
          )`.as('geoPerimeters')
        )
      ) as unknown as SelectQueryBuilder<
      DB,
      'fastHousing',
      O & Partial<HousingIncludeColumns>
    >;
}

function primaryOwner(refs: {
  housingGeoCode: Expression<HousingId['geoCode']>;
  housingId: Expression<HousingId['id']>;
}) {
  return jsonObjectFrom(
    kysely
      .selectFrom('ownersHousing')
      .where('ownersHousing.housingGeoCode', '=', refs.housingGeoCode)
      .where('ownersHousing.housingId', '=', refs.housingId)
      .where('ownersHousing.rank', '=', 1)
      .innerJoin('owners', 'ownersHousing.ownerId', 'owners.id')
      // Nested BAN address (parseOwnerApi reads `owner.ban`). Snake keys survive
      // via CamelCasePlugin's maintainNestedObjectKeys.
      .select((eb) =>
        jsonObjectFrom(
          eb
            .selectFrom('banAddresses')
            .whereRef('banAddresses.refId', '=', 'owners.id')
            .where('banAddresses.addressKind', '=', AddressKinds.Owner)
            .selectAll('banAddresses')
        ).as('ban')
      )
      .selectAll(['owners', 'ownersHousing'])
  );
}

function campaigns(refs: {
  housingGeoCode: Expression<HousingId['geoCode']>;
  housingId: Expression<HousingId['id']>;
  establishmentIds?: ReadonlyArray<Expression<EstablishmentApi['id']>>;
}) {
  return jsonArrayFrom(
    kysely
      .selectFrom('campaignsHousing')
      .where('campaignsHousing.housingGeoCode', '=', refs.housingGeoCode)
      .where('campaignsHousing.housingId', '=', refs.housingId)
      .innerJoin('campaigns', 'campaignsHousing.campaignId', 'campaigns.id')
      .$if(!!refs.establishmentIds && refs.establishmentIds.length > 0, (qb) =>
        qb.where('campaigns.establishmentId', 'in', refs.establishmentIds!)
      )
      .select([
        'campaigns.id',
        'campaigns.title',
        'campaigns.description',
        'campaigns.createdAt',
        'campaigns.sentAt',
        'campaigns.housingCount',
        'campaigns.ownerCount',
        'campaigns.returnCount',
        'campaigns.returnRate'
      ])
  );
}

function paginateQuery(pagination: Partial<Pagination> = DEFAULT_PAGINATION) {
  return <TB extends keyof DB, O>(query: SelectQueryBuilder<DB, TB, O>) => {
    if (pagination?.paginate === false) {
      // Explicitely disable pagination
      return query;
    }

    const { limit, offset } = toLimitOffset({
      paginate: true,
      page: pagination.page ?? DEFAULT_PAGINATION.page,
      perPage: pagination.perPage ?? DEFAULT_PAGINATION.perPage
    });
    return query.limit(limit).offset(offset);
  };
}


type READ_ONLY_FIELDS =
  | 'last_mutation_type'
  | 'plot_area'
  | 'occupancy_history';

export const formatHousingRecordApi = (
  housing: HousingRecordApi
): Omit<HousingRecordDBO, READ_ONLY_FIELDS> => ({
  id: housing.id,
  invariant: housing.invariant,
  local_id: housing.localId,
  plot_id: housing.plotId,
  building_id: housing.buildingId,
  building_group_id: housing.buildingGroupId,
  building_location: housing.buildingLocation,
  building_year: housing.buildingYear,
  address_dgfip: housing.rawAddress,
  longitude_dgfip: housing.longitude,
  latitude_dgfip: housing.latitude,
  rental_value: housing.rentalValue,
  beneficiary_count: housing.beneficiaryCount,
  geolocation: housing.geolocation,
  geo_code: housing.geoCode,
  cadastral_classification: housing.cadastralClassification,
  uncomfortable: housing.uncomfortable,
  vacancy_start_year: housing.vacancyStartYear,
  housing_kind: housing.housingKind,
  rooms_count: housing.roomsCount,
  living_area: housing.livingArea,
  cadastral_reference: housing.cadastralReference,
  taxed: housing.taxed,
  condominium: housing.ownershipKind,
  data_years: housing.dataYears,
  data_file_years: housing.dataFileYears,
  status: housing.status,
  sub_status: housing.subStatus ?? null,
  actual_dpe: housing.actualEnergyConsumption,
  energy_consumption_bdnb: housing.energyConsumption,
  energy_consumption_at_bdnb: housing.energyConsumptionAt,
  occupancy: housing.occupancy,
  occupancy_source: housing.occupancyRegistered,
  occupancy_intended: housing.occupancyIntended ?? null,
  data_source: housing.source,
  mutation_date: null,
  last_mutation_date: housing.lastMutationDate
    ? new Date(housing.lastMutationDate)
    : null,
  last_transaction_date: housing.lastTransactionDate
    ? new Date(housing.lastTransactionDate)
    : null,
  last_transaction_value: housing.lastTransactionValue,
  geolocation_source: null
});

export default {
  find,
  findOne,
  stream,
  count,
  update,
  updateMany,
  save,
  saveMany,
  remove
};
