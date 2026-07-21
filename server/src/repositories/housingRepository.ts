import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

import {
  AddressKinds,
  DataFileYear,
  EnergyConsumption,
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
  type CadastralClassification
} from '@zerologementvacant/models';
import { compactUndefined, isNotNull } from '@zerologementvacant/utils';
import { Array, identity, Predicate, Struct } from 'effect';
import { snakeToCamel } from 'effect/String';
import type { Point } from 'geojson';
import { Set } from 'immutable';
import type { Insertable, Selectable } from 'kysely';
import { sql } from 'kysely';
import { uniq } from 'lodash-es';
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
import { isPaginationEnabled, PaginationApi } from '~/models/PaginationApi';
import { normalizeAddressQuery } from '~/utils/addressNormalization';

import { AddressDBO } from './banAddressesRepository';
import establishmentRepository from './establishmentRepository';
import {
  fromRelativeLocationDBO,
  housingOwnersTable,
  relativeLocationFilterToDBO
} from './housingOwnerRepository';
import { OwnerDBO, parseOwnerApi } from './ownerRepository';

const logger = createLogger('housingRepository');

export const housingTable = 'fast_housing';
export const buildingTable = 'buildings';

export const Housing = (transaction = db) =>
  transaction<HousingDBO>(housingTable);

export const ReferenceDataYear = 2023;

interface FindOptions extends PaginationOptions {
  filters: HousingFiltersApi;
  sort?: HousingSortApi;
  includes?: HousingInclude[];
}

async function find(opts: FindOptions): Promise<HousingApi[]> {
  logger.debug('housingRepository.find', opts);

  // If localities is explicitly set to an empty array, return no results
  // This happens when a user's perimeter has no intersection with their establishment
  if (
    opts.filters.localities !== undefined &&
    opts.filters.localities.length === 0
  ) {
    logger.debug('housingRepository.find: empty localities, returning []');
    return [];
  }

  const [allowedGeoCodes, intercommunalities] = await Promise.all([
    fetchGeoCodes(opts.filters.establishmentIds ?? []),
    fetchGeoCodes(opts.filters.intercommunalities ?? [])
  ]);
  const localities = opts.filters.localities ?? [];
  const defaults = [localities, intercommunalities, allowedGeoCodes].find(
    (array) => array && array.length > 0
  );
  const geoCodes = Set(defaults)
    .withMutations((set) => {
      if (intercommunalities.length > 0) {
        set.intersect(intercommunalities);
      }
      if (allowedGeoCodes.length > 0) {
        set.intersect(allowedGeoCodes);
      }
    })
    .toArray();

  // If we had geo restrictions but the intersection is empty,
  // return empty array instead of querying without geo filter
  const hadGeoRestrictions =
    allowedGeoCodes.length > 0 ||
    intercommunalities.length > 0 ||
    localities.length > 0;
  if (hadGeoRestrictions && geoCodes.length === 0) {
    return [];
  }

  let query = kyselyHousingListQuery({
    filters: {
      ...opts.filters,
      localities: geoCodes
    },
    includes: opts.includes
  });
  query = applyHousingSort(query, opts.sort);
  const pagination: PaginationApi = (opts.pagination as PaginationApi) ?? {
    paginate: true,
    page: 1,
    perPage: 50
  };
  if (isPaginationEnabled(pagination)) {
    query = query
      .limit(pagination.perPage)
      .offset((pagination.page - 1) * pagination.perPage);
  }
  const rows: HousingRow[] = await query.execute();

  logger.debug('housingRepository.find', { housing: rows.length });
  return rows.map(parseHousingRow);
}

interface StreamOptions {
  filters?: HousingFiltersApi;
  includes?: HousingInclude[];
}

function stream(opts?: StreamOptions): ReadableStream<HousingApi> {
  let query = kyselyHousingListQuery({
    filters: opts?.filters ?? {},
    includes: opts?.includes
  });
  query = applyHousingSort(query);
  const rows = query.stream();
  const mapped = (async function* () {
    for await (const row of rows) {
      yield parseHousingRow(row as HousingRow);
    }
  })();
  return Readable.toWeb(Readable.from(mapped)) as ReadableStream<HousingApi>;
}

async function count(filters: HousingFiltersApi): Promise<HousingCountApi> {
  logger.debug('Count housing', filters);

  // If localities is explicitly set to an empty array, return 0
  // This happens when a user's perimeter has no intersection with their establishment
  if (filters.localities !== undefined && filters.localities.length === 0) {
    logger.debug('housingRepository.count: empty localities, returning 0');
    return { housing: 0, owners: 0 };
  }

  const [allowedGeoCodes, intercommunalities] = await Promise.all([
    fetchGeoCodes(filters.establishmentIds ?? []),
    fetchGeoCodes(
      Array.isArray(filters.intercommunalities)
        ? filters.intercommunalities
        : []
    )
  ]);
  const localities = filters.localities ?? [];
  const geoCodes = Set(allowedGeoCodes)
    .withMutations((set) => {
      return intercommunalities.length
        ? set.intersect(intercommunalities)
        : set;
    })
    .withMutations((set) => {
      return localities.length ? set.intersect(localities) : set;
    });

  // If we had geo restrictions but the intersection is empty,
  // return 0 results instead of querying without geo filter
  const hadGeoRestrictions =
    allowedGeoCodes.length > 0 ||
    intercommunalities.length > 0 ||
    localities.length > 0;
  if (hadGeoRestrictions && geoCodes.size === 0) {
    return { housing: 0, owners: 0 };
  }

  const filterByOwner = [
    filters.ownerKinds,
    filters.ownerAges,
    filters.multiOwners,
    filters.query
  ].some((filter) => filter?.length);

  let query: any = kysely
    .selectFrom('fastHousing')
    .leftJoin('ownersHousing', kyselyOwnerHousingJoin);
  if (filterByOwner) {
    query = query.leftJoin('owners', 'ownersHousing.ownerId', 'owners.id');
  }
  query = applyHousingFilters(query, {
    ...Struct.omit(filters, 'establishmentIds'),
    localities: geoCodes.toArray()
  });
  const result = await query
    .select([
      sql`count(distinct fast_housing.id)`.as('housing'),
      sql`count(distinct owners_housing.owner_id)`.as('owners')
    ])
    .executeTakeFirst();

  return {
    housing: Number(result?.housing),
    owners: Number(result?.owners)
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
  let query = kyselyHousingListQuery({
    filters: {
      localities: opts.geoCode,
      establishmentIds: opts.establishment ? [opts.establishment] : undefined
    },
    includes: opts.includes
  });
  if (opts.id) {
    query = query.where('fast_housing.id', '=', opts.id);
  }
  if (opts.localId) {
    query = query.where('fast_housing.local_id', '=', opts.localId);
  }

  const row: HousingRow | undefined = await query.executeTakeFirst();

  return row ? parseHousingRow(row) : null;
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
function toHousingInsert(
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

interface ListQueryOptions {
  filters: HousingFiltersApi;
  includes?: HousingInclude[];
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
  >
): Promise<void> {
  if (housings.length === 0) {
    logger.debug('No housing to update. Skipping...');
    return;
  }

  const fields = compactUndefined({
    status: payload.status,
    subStatus: payload.subStatus,
    occupancy: payload.occupancy,
    occupancyIntended: payload.occupancyIntended
  });
  if (Object.keys(fields).length === 0) {
    logger.debug('No fields to update. Skipping...');
    return;
  }

  logger.debug('Updating many housings...', {
    housings: housings.length,
    payload
  });
  await withinKyselyTransaction(async (trx) => {
    await trx
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
      .set(fields)
      .execute();
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

export function ownerHousingJoinClause(query: any) {
  query
    .on(`${housingTable}.id`, `${housingOwnersTable}.housing_id`)
    .andOn(`${housingTable}.geo_code`, `${housingOwnersTable}.housing_geo_code`)
    .andOnVal('rank', 1);
}

/**
 * Retrieve geo codes as literals to help the query planner,
 * otherwise it would go throughout a lot of irrelevant partitions
 * @param establishmentIds
 */
async function fetchGeoCodes(establishmentIds: string[]): Promise<string[]> {
  const establishments = await establishmentRepository.find({
    filters: {
      id: establishmentIds
    }
  });
  return establishments.flatMap((establishment) => establishment.geoCodes);
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

// ---------------------------------------------------------------------------
// Kysely read layer (find/findOne/stream/count). Mirrors the Knex builders
// below; the Knex query surface is kept for seeds/LOVAC/still-Knex callers.
// The joined query is raw-SQL-heavy (lateral aggregates, geo/text filters),
// so the builders are `any`-typed — behaviour is pinned by the characterization
// tests, not the compiler.
// ---------------------------------------------------------------------------

function kyselyHousingListQuery(opts: ListQueryOptions): any {
  let query: any = kysely.selectFrom('fastHousing').selectAll('fastHousing');
  query = applyHousingIncludes(query, opts.includes ?? [], opts.filters);
  query = applyHousingFilters(
    query,
    Struct.omit(opts.filters, 'establishmentIds')
  );
  return query;
}

function kyselyOwnerHousingJoin(join: any): any {
  return join
    .onRef('fastHousing.id', '=', 'ownersHousing.housingId')
    .onRef('fastHousing.geoCode', '=', 'ownersHousing.housingGeoCode')
    .on('ownersHousing.rank', '=', 1);
}

function applyHousingIncludes(
  query: any,
  includes: HousingInclude[],
  filters?: HousingFiltersApi
): any {
  const effectiveIncludes = [...includes];
  const filterByOwner = [
    filters?.ownerIds,
    filters?.ownerKinds,
    filters?.ownerAges,
    filters?.multiOwners,
    filters?.query
  ].some((filter) => filter?.length);
  if (filterByOwner) {
    effectiveIncludes.push('owner');
  }
  if (filters?.campaignIds?.length || filters?.campaignCount !== undefined) {
    effectiveIncludes.push('campaigns');
  }

  let q = query;
  for (const inc of uniq(effectiveIncludes)) {
    switch (inc) {
      case 'owner': {
        q = q
          .leftJoin('ownersHousing', kyselyOwnerHousingJoin)
          .leftJoin('owners', 'ownersHousing.ownerId', 'owners.id')
          .leftJoin('banAddresses as ban', (join: any) =>
            join
              .onRef('owners.id', '=', 'ban.refId')
              .on('ban.addressKind', '=', AddressKinds.Owner)
          )
          .select('owners.id as owner_id')
          .select(sql`to_json(owners.*)`.as('owner'))
          .select('ownersHousing.locpropRelativeBan')
          .select(sql`to_json(ban.*)`.as('owner_ban_address'));
        break;
      }
      case 'campaigns': {
        const establishmentFilter = filters?.establishmentIds?.length
          ? sql` AND campaigns.establishment_id = ANY(${sql.val(filters.establishmentIds)})`
          : sql``;
        q = q.select(
          sql`(
            SELECT coalesce(array_agg(distinct(campaign_id)), ARRAY[]::UUID[])
            FROM campaigns_housing, campaigns
            WHERE fast_housing.id = campaigns_housing.housing_id
              AND fast_housing.geo_code = campaigns_housing.housing_geo_code
              AND campaigns.id = campaigns_housing.campaign_id
              ${establishmentFilter}
          )`.as('campaign_ids')
        );
        break;
      }
      case 'perimeters': {
        q = q.select(
          sql`(
            SELECT json_agg(distinct(kind))
            FROM geo_perimeters perimeter
            WHERE st_contains(perimeter.geom, ST_SetSRID(ST_Point(fast_housing.longitude_dgfip, fast_housing.latitude_dgfip), 4326))
          )`.as('geo_perimeters')
        );
        break;
      }
      case 'precisions': {
        q = q.select(
          sql`(
            SELECT json_agg(precisions.*)
            FROM housing_precisions
            LEFT JOIN precisions ON precisions.id = housing_precisions.precision_id
            WHERE fast_housing.geo_code = housing_precisions.housing_geo_code
              AND fast_housing.id = housing_precisions.housing_id
          )`.as('precisions')
        );
        break;
      }
      case 'buildings': {
        q = q
          .leftJoin('buildings', 'fastHousing.buildingId', 'buildings.id')
          .select('buildings.classDpe as building_class_dpe')
          .select('buildings.dpeDateAt as building_dpe_date_at');
        break;
      }
    }
  }
  return q;
}

function applyHousingSort(query: any, sort?: HousingSortApi): any {
  if (!sort) {
    return query.orderBy('fast_housing.geo_code').orderBy('fast_housing.id');
  }
  let q = query;
  const s = sort as any;
  for (const key of Object.keys(sort)) {
    if (key === 'owner') {
      q = q.orderBy('owners.full_name', s.owner);
    } else if (key === 'occupancy') {
      q = q.orderBy(
        sql`LOWER(fast_housing.occupancy)`,
        sql.raw(s.occupancy ?? 'asc')
      );
    } else if (key === 'status') {
      q = q.orderBy('fast_housing.status', s.status);
    }
  }
  return q;
}

type HousingRow = Selectable<DB['fastHousing']> & {
  owner?: OwnerDBO | null;
  ownerBanAddress?: AddressDBO;
  campaignIds?: string[];
  geoPerimeters?: string[];
  precisions?: Precision[];
  ownerId?: string;
  locpropRelativeBan?: number | null;
  housingCount?: number;
  vacantHousingCount?: number;
  contactCount?: number;
  localityKind?: string;
  buildingClassDpe?: EnergyConsumption | null;
  buildingDpeDateAt?: Date | string | null;
};

function applyHousingFilters(
  query: any,
  filters: Omit<HousingFiltersApi, 'establishmentIds'>
): any {
  let q = query;

  // housingIds
  if (filters.housingIds?.length) {
    if (filters.all) {
      q = q.where('fast_housing.id', 'not in', filters.housingIds);
    } else {
      q = q.where('fast_housing.id', 'in', filters.housingIds);
    }
  }

  // occupancies
  if (filters.occupancies?.length) {
    const occupancies = [
      ...(filters.occupancies ?? []).filter((occupancy) =>
        READ_WRITE_OCCUPANCY_VALUES.includes(occupancy)
      ),
      ...(filters.occupancies?.includes(Occupancy.OTHERS)
        ? READ_ONLY_OCCUPANCY_VALUES
        : [])
    ];
    if (occupancies.length > 0) {
      q = q.where('occupancy', 'in', occupancies);
    }
  }

  // energyConsumption
  if (filters.energyConsumption?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.energyConsumption?.includes(null)) {
        arms.push(
          eb.exists((sub: any) =>
            sub
              .selectFrom('buildings')
              .select('buildings.id')
              .whereRef('buildings.id', '=', 'fast_housing.building_id')
              .where('buildings.class_dpe', 'is', null)
          )
        );
      }
      const energyConsumptions = filters.energyConsumption?.filter(isNotNull);
      if (energyConsumptions?.length) {
        arms.push(
          eb.exists((sub: any) =>
            sub
              .selectFrom('buildings')
              .select('buildings.id')
              .whereRef('buildings.id', '=', 'fast_housing.building_id')
              .where('buildings.class_dpe', 'in', energyConsumptions)
          )
        );
      }
      return eb.or(arms);
    });
  }

  // groupIds — requires join
  if (filters.groupIds?.length) {
    q = q.innerJoin('groups_housing', (join: any) =>
      join
        .onRef('groups_housing.housing_geo_code', '=', 'fast_housing.geo_code')
        .onRef('groups_housing.housing_id', '=', 'fast_housing.id')
        .on('groups_housing.group_id', 'in', filters.groupIds ?? [])
    );
  }

  // campaignIds
  if (filters.campaignIds?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.campaignIds?.includes(null)) {
        arms.push(
          eb.not(
            eb.exists((sub: any) =>
              sub
                .selectFrom('campaigns_housing')
                .select(sql`1`.as('one'))
                .whereRef(
                  'campaigns_housing.housing_geo_code',
                  '=',
                  'fast_housing.geo_code'
                )
                .whereRef(
                  'campaigns_housing.housing_id',
                  '=',
                  'fast_housing.id'
                )
            )
          )
        );
      }
      const ids = filters.campaignIds?.filter((id) => id !== null);
      if (ids?.length) {
        arms.push(
          eb.exists((sub: any) =>
            sub
              .selectFrom('campaigns_housing')
              .select('campaigns_housing.housing_id')
              .where('campaigns_housing.campaign_id', 'in', ids)
              .whereRef(
                'campaigns_housing.housing_geo_code',
                '=',
                'fast_housing.geo_code'
              )
              .whereRef('campaigns_housing.housing_id', '=', 'fast_housing.id')
          )
        );
      }
      return eb.or(arms);
    });
  }

  // campaignCount
  if (filters.campaignCount !== undefined) {
    q = q.where(
      sql`cardinality(${sql.ref('campaigns.campaign_ids')}) = ${filters.campaignCount}`
    );
  }

  // ownerIds
  if (filters.ownerIds?.length) {
    q = q.where('owners_housing.owner_id', 'in', filters.ownerIds);
  }

  // ownerKinds
  if (filters.ownerKinds?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.ownerKinds?.includes(null)) {
        arms.push(eb('owners.kind_class', 'is', null));
      }
      const ownerKinds = filters.ownerKinds
        ?.filter(isNotNull)
        ?.map((kind) => OWNER_KIND_LABELS[kind]);
      if (ownerKinds?.length) {
        arms.push(eb('owners.kind_class', 'in', ownerKinds));
      }
      return eb.or(arms);
    });
  }

  // ownerAges
  if (filters.ownerAges?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.ownerAges?.includes(null)) {
        arms.push(eb('owners.birth_date', 'is', null));
      }
      if (filters.ownerAges?.includes('lt40')) {
        arms.push(sql`EXTRACT(YEAR FROM AGE(birth_date)) < 40`);
      }
      if (filters.ownerAges?.includes('40to59')) {
        arms.push(sql`EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 40 AND 59`);
      }
      if (filters.ownerAges?.includes('60to74')) {
        arms.push(sql`EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 60 AND 74`);
      }
      if (filters.ownerAges?.includes('75to99')) {
        arms.push(sql`EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 75 AND 99`);
      }
      if (filters.ownerAges?.includes('gte100')) {
        arms.push(sql`EXTRACT(YEAR FROM AGE(birth_date)) >= 100`);
      }
      return eb.or(arms);
    });
  }

  // relativeLocations
  if (filters.relativeLocations?.length) {
    const numericValues = filters.relativeLocations.flatMap(
      relativeLocationFilterToDBO
    );
    q = q.where((eb: any) =>
      eb.exists((sub: any) =>
        sub
          .selectFrom('owners_housing')
          .whereRef('owners_housing.housing_id', '=', 'fast_housing.id')
          .whereRef(
            'owners_housing.housing_geo_code',
            '=',
            'fast_housing.geo_code'
          )
          .where('owners_housing.rank', '=', 1)
          .where('owners_housing.locprop_relative_ban', 'in', numericValues)
      )
    );
  }

  // multiOwners
  if (filters.multiOwners?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.multiOwners?.includes(true)) {
        arms.push(eb('owners.is_multi_owner', '=', true));
      }
      if (filters.multiOwners?.includes(false)) {
        arms.push(eb('owners.is_multi_owner', '=', false));
      }
      return eb.or(arms);
    });
  }

  // precisions
  if (filters.precisions?.length) {
    q = q.where('fast_housing.id', 'in', (sub: any) =>
      sub
        .selectFrom('housing_precisions')
        .select('housing_precisions.housing_id')
        .where(
          'housing_precisions.precision_id',
          'in',
          filters.precisions ?? []
        )
    );
  }

  // beneficiaryCounts
  if (filters.beneficiaryCounts?.length) {
    q = q.where((eb: any) => {
      const counts = filters.beneficiaryCounts
        ?.map(Number)
        ?.filter((count) => !Number.isNaN(count) && count > 0);
      const hasGte5 = filters.beneficiaryCounts?.includes('gte5') ?? false;
      const hasZero = filters.beneficiaryCounts?.includes('0') ?? false;

      const arms: any[] = [];

      if (counts?.length || hasGte5) {
        // composite (geo_code, id) IN (subquery with HAVING)
        arms.push(
          eb(
            sql`(fast_housing.geo_code, fast_housing.id)`,
            'in',
            (sub: any) => {
              let s = sub
                .selectFrom('owners_housing')
                .select([
                  'owners_housing.housing_geo_code',
                  'owners_housing.housing_id'
                ])
                .where('owners_housing.rank', '>=', 1)
                .groupBy([
                  'owners_housing.housing_geo_code',
                  'owners_housing.housing_id'
                ]);
              if (filters.localities?.length) {
                s = s.where(
                  'owners_housing.housing_geo_code',
                  'in',
                  filters.localities
                );
              }
              if (counts?.length && hasGte5) {
                s = s.having(
                  sql`COUNT(*) IN (${sql.join(counts)}) OR COUNT(*) >= 5`
                );
              } else if (counts?.length) {
                s = s.having(sql`COUNT(*) IN (${sql.join(counts)})`);
              } else if (hasGte5) {
                s = s.having(sql`COUNT(*) >= 5`);
              }
              return s;
            }
          )
        );
      }

      if (hasZero) {
        arms.push(
          eb.not(
            eb.exists((sub: any) =>
              sub
                .selectFrom('owners_housing')
                .select(sql`1`.as('one'))
                .whereRef(
                  'owners_housing.housing_geo_code',
                  '=',
                  'fast_housing.geo_code'
                )
                .whereRef('owners_housing.housing_id', '=', 'fast_housing.id')
                .where('owners_housing.rank', '>=', 1)
            )
          )
        );
      }

      return eb.or(arms);
    });
  }

  // housingKinds
  if (filters.housingKinds?.length) {
    q = q.where('housing_kind', 'in', filters.housingKinds);
  }

  // housingAreas
  if (filters.housingAreas?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.housingAreas?.includes('lt35')) {
        arms.push(eb.between('living_area', 0, 34));
      }
      if (filters.housingAreas?.includes('35to74')) {
        arms.push(eb.between('living_area', 35, 74));
      }
      if (filters.housingAreas?.includes('75to99')) {
        arms.push(eb.between('living_area', 75, 99));
      }
      if (filters.housingAreas?.includes('gte100')) {
        arms.push(sql`living_area >= 100`);
      }
      return eb.or(arms);
    });
  }

  // roomsCounts
  if (filters.roomsCounts?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.roomsCounts?.includes('gte5')) {
        arms.push(eb('fast_housing.rooms_count', '>=', 5));
      }
      const roomCounts = filters.roomsCounts
        ?.map(Number)
        ?.filter((count) => !Number.isNaN(count));
      if (roomCounts && roomCounts.length) {
        arms.push(eb('fast_housing.rooms_count', 'in', roomCounts));
      }
      return eb.or(arms);
    });
  }

  // cadastralClassifications
  if (filters.cadastralClassifications?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.cadastralClassifications?.includes(null)) {
        arms.push(eb('fast_housing.cadastral_classification', 'is', null));
      }
      const cadastralClassifications =
        filters.cadastralClassifications?.filter(isNotNull);
      if (cadastralClassifications?.length) {
        arms.push(
          eb(
            'fast_housing.cadastral_classification',
            'in',
            cadastralClassifications
          )
        );
      }
      return eb.or(arms);
    });
  }

  // buildingPeriods
  if (filters.buildingPeriods?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.buildingPeriods?.includes('lt1919')) {
        arms.push(eb.between('fast_housing.building_year', 0, 1918));
      }
      if (filters.buildingPeriods?.includes('1919to1945')) {
        arms.push(eb.between('fast_housing.building_year', 1919, 1945));
      }
      if (filters.buildingPeriods?.includes('1946to1990')) {
        arms.push(eb.between('fast_housing.building_year', 1946, 1990));
      }
      if (filters.buildingPeriods?.includes('gte1991')) {
        arms.push(eb('fast_housing.building_year', '>=', 1991));
      }
      return eb.or(arms);
    });
  }

  // vacancyYears
  if (filters.vacancyYears?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.vacancyYears?.includes('2022')) {
        arms.push(eb('vacancy_start_year', '=', 2022));
      }
      if (filters.vacancyYears?.includes('2021')) {
        arms.push(eb('vacancy_start_year', '=', 2021));
      }
      if (filters.vacancyYears?.includes('2020')) {
        arms.push(eb('vacancy_start_year', '=', 2020));
      }
      if (filters.vacancyYears?.includes('2019')) {
        arms.push(eb('vacancy_start_year', '=', 2019));
      }
      if (filters.vacancyYears?.includes('2018to2015')) {
        arms.push(eb.between('vacancy_start_year', 2015, 2018));
      }
      if (filters.vacancyYears?.includes('2014to2010')) {
        arms.push(eb.between('vacancy_start_year', 2010, 2014));
      }
      if (filters.vacancyYears?.includes('before2010')) {
        arms.push(eb('vacancy_start_year', '<', 2010));
      }
      if (filters.vacancyYears?.includes('missingData')) {
        arms.push(eb('vacancy_start_year', 'is', null));
      }
      if (filters.vacancyYears?.includes('2023')) {
        arms.push(eb('vacancy_start_year', '=', 2023));
      }
      return eb.or(arms);
    });
  }

  // isTaxedValues
  if (filters.isTaxedValues?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.isTaxedValues?.includes(true)) {
        arms.push(sql`taxed`);
      }
      if (filters.isTaxedValues?.includes(false)) {
        arms.push(eb('taxed', 'is', null));
        arms.push(sql`not(taxed)`);
      }
      return eb.or(arms);
    });
  }

  // ownershipKinds
  if (filters.ownershipKinds?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.ownershipKinds?.includes('single')) {
        arms.push(
          eb.or([
            eb('fast_housing.condominium', 'is', null),
            eb(
              'fast_housing.condominium',
              'in',
              INTERNAL_MONO_CONDOMINIUM_VALUES
            )
          ])
        );
      }
      if (filters.ownershipKinds?.includes('co')) {
        arms.push(
          eb('fast_housing.condominium', 'in', INTERNAL_CO_CONDOMINIUM_VALUES)
        );
      }
      if (filters.ownershipKinds?.includes('other')) {
        arms.push(
          eb.and([
            eb('fast_housing.condominium', 'is not', null),
            eb('fast_housing.condominium', 'not in', [
              ...INTERNAL_MONO_CONDOMINIUM_VALUES,
              ...INTERNAL_CO_CONDOMINIUM_VALUES
            ])
          ])
        );
      }
      return eb.or(arms);
    });
  }

  // housingCounts / vacancyRates — require join on buildings
  if (filters.housingCounts?.length || filters.vacancyRates?.length) {
    q = q.innerJoin('buildings', 'fast_housing.building_id', 'buildings.id');
  }

  if (filters.housingCounts?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.housingCounts?.includes('lt5')) {
        arms.push(sql`coalesce(housing_count, 0) between 0 and 4`);
      }
      if (filters.housingCounts?.includes('5to19')) {
        arms.push(eb.between('housing_count', 5, 19));
      }
      if (filters.housingCounts?.includes('20to49')) {
        arms.push(eb.between('housing_count', 20, 49));
      }
      if (filters.housingCounts?.includes('gte50')) {
        arms.push(sql`housing_count >= 50`);
      }
      return eb.or(arms);
    });
  }

  // vacancyRates
  if (filters.vacancyRates?.length) {
    q = q.where((eb: any) => {
      const safeExpr = sql`housing_count > 0 AND vacant_housing_count * 100.0 / housing_count`;
      const arms: any[] = [];
      if (filters.vacancyRates?.includes('lt20')) {
        arms.push(sql`${safeExpr} < 20`);
      }
      if (filters.vacancyRates?.includes('20to39')) {
        arms.push(sql`${safeExpr} BETWEEN 20 AND 39`);
      }
      if (filters.vacancyRates?.includes('40to59')) {
        arms.push(sql`${safeExpr} BETWEEN 40 AND 59`);
      }
      if (filters.vacancyRates?.includes('60to79')) {
        arms.push(sql`${safeExpr} BETWEEN 60 AND 79`);
      }
      if (filters.vacancyRates?.includes('gte80')) {
        arms.push(sql`${safeExpr} >= 80`);
      }
      return eb.or(arms);
    });
  }

  // departments
  if (filters.departments?.length) {
    q = q.where((eb: any) => {
      const arms = filters.departments!.map(
        (dept) => sql`LEFT(fast_housing.geo_code, ${dept.length}) = ${dept}`
      );
      return eb.or(arms);
    });
  }

  // localities
  if (filters.localities?.length) {
    q = q.where('fast_housing.geo_code', 'in', filters.localities);
  }

  // localityKinds — requires join
  if (filters.localityKinds?.length) {
    q = q.innerJoin(
      'localities',
      'fast_housing.geo_code',
      'localities.geo_code'
    );
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.localityKinds?.includes(null)) {
        arms.push(eb('localities.locality_kind', 'is', null));
      }
      const localityKinds = filters.localityKinds?.filter(isNotNull);
      if (localityKinds?.length) {
        arms.push(eb('localities.locality_kind', 'in', localityKinds));
      }
      return eb.or(arms);
    });
  }

  // geoPerimetersIncluded
  if (filters.geoPerimetersIncluded && filters.geoPerimetersIncluded.length) {
    q = q.where((eb: any) =>
      eb.exists((sub: any) =>
        sub
          .selectFrom('geo_perimeters')
          .select(sql`1`.as('one'))
          .where('geo_perimeters.kind', 'in', filters.geoPerimetersIncluded)
          .where(
            sql`st_contains(geo_perimeters.geom, ST_SetSRID(ST_Point(fast_housing.longitude_dgfip, fast_housing.latitude_dgfip), 4326))`
          )
      )
    );
  }

  // geoPerimetersExcluded
  if (filters.geoPerimetersExcluded && filters.geoPerimetersExcluded.length) {
    q = q.where((eb: any) =>
      eb.not(
        eb.exists((sub: any) =>
          sub
            .selectFrom('geo_perimeters')
            .selectAll('geo_perimeters')
            .where('geo_perimeters.kind', 'in', filters.geoPerimetersExcluded)
            .where(
              sql`st_contains(geo_perimeters.geom, ST_SetSRID(ST_Point(fast_housing.longitude_dgfip, fast_housing.latitude_dgfip), 4326))`
            )
        )
      )
    );
  }

  // dataFileYearsIncluded
  if (filters.dataFileYearsIncluded?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.dataFileYearsIncluded?.includes(null)) {
        arms.push(eb('data_file_years', 'is', null));
        arms.push(sql`cardinality(data_file_years) = 0`);
      }
      if (filters.dataFileYearsIncluded?.includes('datafoncier-manual')) {
        arms.push(eb('fast_housing.data_source', '=', 'datafoncier-manual'));
      }
      const dataFileYears = filters.dataFileYearsIncluded?.filter(
        (v): v is DataFileYear => isNotNull(v) && v !== 'datafoncier-manual'
      );
      if (dataFileYears?.length) {
        arms.push(sql`data_file_years && ${sql.val(dataFileYears)}::text[]`);
      }
      return eb.or(arms);
    });
  }

  // dataFileYearsExcluded
  if (filters.dataFileYearsExcluded?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      if (filters.dataFileYearsExcluded?.includes(null)) {
        // AND of not-null + cardinality>0 (translated as a single AND expression arm)
        arms.push(
          eb.and([
            eb('data_file_years', 'is not', null),
            sql`cardinality(data_file_years) > 0`
          ])
        );
      }
      if (filters.dataFileYearsExcluded?.includes('datafoncier-manual')) {
        arms.push(
          eb.or([
            eb('fast_housing.data_source', 'is', null),
            eb('fast_housing.data_source', '!=', 'datafoncier-manual')
          ])
        );
      }
      const dataFileYears = filters.dataFileYearsExcluded?.filter(
        (v): v is DataFileYear => isNotNull(v) && v !== 'datafoncier-manual'
      );
      if (dataFileYears?.length) {
        arms.push(
          sql`not(data_file_years && ${sql.val(dataFileYears)}::text[])`
        );
      }
      return eb.or(arms);
    });
  }

  // statusList
  if (filters.statusList?.length) {
    q = q.where('status', 'in', filters.statusList);
  }

  // status (exact)
  if (filters.status !== undefined) {
    q = q.where('status', '=', filters.status);
  }

  // subStatus
  if (filters.subStatus?.length) {
    q = q.where('sub_status', 'in', filters.subStatus);
  }

  // query (full-text / address search)
  if (filters.query?.length) {
    const { query } = filters;
    q = q.where((eb: any) => {
      const arms: any[] = [];

      // With more than 20 tokens, the query is likely nor a name neither an address
      if (query.replaceAll(' ', ',').split(',').length < 20) {
        arms.push(sql`invariant = ${query}`);
        arms.push(sql`local_id = ${query}`);
        arms.push(
          sql`upper(unaccent(full_name)) like '%' || upper(unaccent(${query})) || '%'`
        );
        arms.push(
          sql`upper(unaccent(full_name)) like '%' || upper(unaccent(${query
            ?.split(' ')
            .reverse()
            .join(' ')})) || '%'`
        );
        arms.push(
          sql`upper(unaccent(administrator)) like '%' || upper(unaccent(${query})) || '%'`
        );
        arms.push(
          sql`upper(unaccent(administrator)) like '%' || upper(unaccent(${query
            ?.split(' ')
            .reverse()
            .join(' ')})) || '%'`
        );

        // Enhanced address search with FANTOIR normalization
        for (const variation of normalizeAddressQuery(query)) {
          arms.push(
            sql`replace(upper(unaccent(array_to_string(${sql.ref('fast_housing.address_dgfip')}, '%'))), ' ', '') like '%' || replace(upper(unaccent(${variation})), ' ', '') || '%'`
          );
        }
        for (const variation of normalizeAddressQuery(query)) {
          arms.push(
            sql`replace(upper(unaccent(array_to_string(${sql.ref('owners.address_dgfip')}, '%'))), ' ', '') like '%' || replace(upper(unaccent(${variation})), ' ', '') || '%'`
          );
        }
      }

      arms.push(
        eb(
          'invariant',
          'in',
          query
            ?.replaceAll(' ', ',')
            .split(',')
            .map((_) => _.trim())
        )
      );
      arms.push(
        eb(
          'local_id',
          'in',
          query
            ?.replaceAll(' ', ',')
            .split(',')
            .map((_) => _.trim())
        )
      );
      arms.push(
        eb(
          'cadastral_reference',
          'in',
          query
            ?.replaceAll(' ', ',')
            .split(',')
            .map((_) => _.trim())
        )
      );

      return eb.or(arms);
    });
  }

  // lastMutationYears — null branch (no active years required)
  if (filters.lastMutationYears?.includes(null)) {
    q = q.where((eb: any) =>
      eb.and([
        eb('fast_housing.last_mutation_date', 'is', null),
        eb('fast_housing.last_transaction_date', 'is', null)
      ])
    );
  }

  // lastMutationYears — main branch (typed year ranges)
  if (filters.lastMutationYears?.length) {
    q = q.where((eb: any) => {
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
            .with('2010to2014', () => ['2010', '2011', '2012', '2013', '2014'])
            .otherwise(() => [])
        );
      const types: ReadonlyArray<MutationType> = !filters.lastMutationTypes
        ?.length
        ? MUTATION_TYPE_VALUES
        : filters.lastMutationTypes;

      const arms: any[] = [];

      if (types.includes('donation')) {
        const donationInner: any[] = [];
        if (years.length) {
          donationInner.push(
            sql`EXTRACT(YEAR FROM ${sql.ref('fast_housing.last_mutation_date')}) = ANY(${sql.val(years)})`
          );
        }
        if (filters.lastMutationYears?.includes('lte2009')) {
          donationInner.push(
            sql`EXTRACT(YEAR FROM ${sql.ref('fast_housing.last_mutation_date')}) <= 2009`
          );
        }
        // donation: orWhereRaw(years) then whereRaw(lte2009) → AND semantics (first OR is no-op on first term)
        arms.push(
          eb.and([
            eb('fast_housing.last_mutation_type', '=', 'donation'),
            ...(donationInner.length ? [eb.and(donationInner)] : [])
          ])
        );
      }

      if (types.includes('sale')) {
        const saleInner: any[] = [];
        if (years.length) {
          // NOTE: original uses .whereRaw (not .orWhereRaw) for both arms in the 'sale' branch → AND semantics
          saleInner.push(
            sql`EXTRACT(YEAR FROM ${sql.ref('fast_housing.last_transaction_date')}) = ANY(${sql.val(years)})`
          );
        }
        if (filters.lastMutationYears?.includes('lte2009')) {
          saleInner.push(
            sql`EXTRACT(YEAR FROM ${sql.ref('fast_housing.last_transaction_date')}) <= 2009`
          );
        }
        arms.push(
          eb.and([
            eb('fast_housing.last_mutation_type', '=', 'sale'),
            ...(saleInner.length ? [eb.and(saleInner)] : [])
          ])
        );
      }

      if (types.includes(null)) {
        const nullTypeInner: any[] = [];
        if (years.length) {
          nullTypeInner.push(
            sql`EXTRACT(YEAR FROM ${sql.ref('fast_housing.last_mutation_date')}) = ANY(${sql.val(years)})`
          );
        }
        if (filters.lastMutationYears?.includes('lte2009')) {
          nullTypeInner.push(
            sql`EXTRACT(YEAR FROM ${sql.ref('fast_housing.last_mutation_date')}) <= 2009`
          );
        }
        if (filters.lastMutationYears?.includes(null)) {
          nullTypeInner.push(eb('fast_housing.last_mutation_date', 'is', null));
        }
        arms.push(
          eb.and([
            eb('fast_housing.last_mutation_type', 'is', null),
            ...(nullTypeInner.length ? [eb.or(nullTypeInner)] : [])
          ])
        );
      }

      return eb.or(arms);
    });
  }

  // lastMutationTypes
  if (filters.lastMutationTypes?.length) {
    q = q.where((eb: any) => {
      const arms: any[] = [];
      const nonNullValues =
        filters.lastMutationTypes?.filter(Predicate.isNotNull) ?? [];
      if (nonNullValues.length) {
        arms.push(eb('fast_housing.last_mutation_type', 'in', nonNullValues));
      }
      if (filters.lastMutationTypes?.includes(null)) {
        arms.push(eb('fast_housing.last_mutation_type', 'is', null));
      }
      return eb.or(arms);
    });
  }

  return q;
}

export const parseHousingRow = (row: HousingRow): HousingApi => ({
  id: row.id,
  invariant: row.invariant,
  localId: row.localId,
  plotId: row.plotId,
  plotArea: row.plotArea,
  buildingGroupId: row.buildingGroupId,
  buildingHousingCount: row.housingCount,
  buildingId: row.buildingId,
  buildingLocation: row.buildingLocation,
  buildingVacancyRate: row.vacantHousingCount
    ? Math.round(
        (row.vacantHousingCount * 100) /
          (row.housingCount ?? row.vacantHousingCount)
      )
    : undefined,
  buildingYear: row.buildingYear,
  rawAddress: row.addressDgfip,
  beneficiaryCount: row.beneficiaryCount,
  rentalValue: row.rentalValue,
  geoCode: row.geoCode,
  longitude: row.longitudeDgfip,
  latitude: row.latitudeDgfip,
  geolocation: row.geolocation as unknown as Point | null,
  cadastralClassification:
    row.cadastralClassification as CadastralClassification | null,
  uncomfortable: row.uncomfortable,
  vacancyStartYear: row.vacancyStartYear,
  housingKind: row.housingKind as HousingKind,
  roomsCount: row.roomsCount,
  livingArea: row.livingArea,
  cadastralReference: row.cadastralReference,
  taxed: row.taxed,
  dataYears: row.dataYears,
  dataFileYears: (row.dataFileYears ?? []) as DataFileYear[],
  ownershipKind: row.condominium,
  status: row.status as HousingStatus,
  subStatus: row.subStatus,
  precisions: row.precisions,
  actualEnergyConsumption: row.actualDpe as EnergyConsumption | null,
  energyConsumption: row.buildingClassDpe ?? null,
  energyConsumptionAt: row.buildingDpeDateAt
    ? new Date(row.buildingDpeDateAt)
    : null,
  occupancy: row.occupancy as Occupancy,
  occupancyRegistered: row.occupancySource as Occupancy,
  occupancyIntended: row.occupancyIntended as Occupancy | null,
  localityKind: row.localityKind,
  geoPerimeters: row.geoPerimeters,
  owner: row.owner
    ? parseOwnerApi({
        ...row.owner,
        ...row.ownerBanAddress,
        ban: row.ownerBanAddress
      })
    : null,
  ownerRelativeLocation: fromRelativeLocationDBO(
    row.locpropRelativeBan ?? null
  ),
  campaignIds: (row.campaignIds ?? []).filter((_: any) => _),
  contactCount: Number(row.contactCount),
  source: row.dataSource as HousingSource | null,
  lastMutationType: row.lastMutationType as Mutation['type'] | null,
  lastMutationDate: row.lastMutationDate
    ? new Date(row.lastMutationDate).toJSON()
    : null,
  lastTransactionDate: row.lastTransactionDate
    ? new Date(row.lastTransactionDate).toJSON()
    : null,
  lastTransactionValue: row.lastTransactionValue
});

export const parseHousingApi = (housing: HousingDBO): HousingApi => ({
  id: housing.id,
  invariant: housing.invariant,
  localId: housing.local_id,
  plotId: housing.plot_id,
  plotArea: housing.plot_area,
  buildingGroupId: housing.building_group_id,
  buildingHousingCount: housing.housing_count,
  buildingId: housing.building_id,
  buildingLocation: housing.building_location,
  buildingVacancyRate: housing.vacant_housing_count
    ? Math.round(
        (housing.vacant_housing_count * 100) /
          (housing.housing_count ?? housing.vacant_housing_count)
      )
    : undefined,
  buildingYear: housing.building_year,
  rawAddress: housing.address_dgfip,
  beneficiaryCount: housing.beneficiary_count,
  rentalValue: housing.rental_value,
  geoCode: housing.geo_code,
  longitude: housing.longitude_dgfip,
  latitude: housing.latitude_dgfip,
  geolocation: housing.geolocation,
  cadastralClassification: housing.cadastral_classification,
  uncomfortable: housing.uncomfortable,
  vacancyStartYear: housing.vacancy_start_year,
  housingKind: housing.housing_kind,
  roomsCount: housing.rooms_count,
  livingArea: housing.living_area,
  cadastralReference: housing.cadastral_reference,
  taxed: housing.taxed,
  dataYears: housing.data_years,
  dataFileYears: housing.data_file_years ?? [],
  ownershipKind: housing.condominium,
  status: housing.status,
  subStatus: housing.sub_status,
  precisions: housing.precisions,
  actualEnergyConsumption: housing.actual_dpe,
  energyConsumption: housing.building_class_dpe ?? null,
  energyConsumptionAt: housing.building_dpe_date_at
    ? new Date(housing.building_dpe_date_at)
    : null,
  occupancy: housing.occupancy,
  occupancyRegistered: housing.occupancy_source,
  occupancyIntended: housing.occupancy_intended,
  localityKind: housing.locality_kind,
  geoPerimeters: housing.geo_perimeters,
  owner: housing.owner
    ? parseOwnerApi({
        ...housing.owner,
        ...housing.owner_ban_address,
        ban: housing.owner_ban_address
      })
    : null,
  ownerRelativeLocation: fromRelativeLocationDBO(
    housing.locprop_relative_ban ?? null
  ),
  campaignIds: (housing.campaign_ids ?? []).filter((_: any) => _),
  contactCount: Number(housing.contact_count),
  source: housing.data_source,
  lastMutationType: housing.last_mutation_type,
  lastMutationDate: housing.last_mutation_date
    ? new Date(housing.last_mutation_date).toJSON()
    : null,
  lastTransactionDate: housing.last_transaction_date
    ? new Date(housing.last_transaction_date).toJSON()
    : null,
  lastTransactionValue: housing.last_transaction_value
});

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
