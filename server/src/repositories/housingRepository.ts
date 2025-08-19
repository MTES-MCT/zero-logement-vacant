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
  READ_WRITE_OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { compactNullable, isNotNull } from '@zerologementvacant/utils';
import { Array, identity, Predicate, Struct } from 'effect';
import highland from 'highland';
import { Set } from 'immutable';
import { Knex } from 'knex';
import { uniq } from 'lodash-es';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';
import { match, Pattern } from 'ts-pattern';

import db, { toRawArray, where } from '~/infra/database';
import {
  getTransaction,
  withinTransaction
} from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import {
  HousingApi,
  HousingRecordApi,
  HousingSortApi,
  type HousingId
} from '~/models/HousingApi';
import { HousingCountApi } from '~/models/HousingCountApi';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { PaginationApi, paginationQuery } from '~/models/PaginationApi';
import { sortQuery } from '~/models/SortApi';
import {
  HOUSING_PRECISION_TABLE,
  PRECISION_TABLE
} from '~/repositories/precisionRepository';
import { AddressDBO, banAddressesTable } from './banAddressesRepository';
import { campaignsHousingTable } from './campaignHousingRepository';
import { campaignsTable } from './campaignRepository';
import establishmentRepository from './establishmentRepository';
import { geoPerimetersTable } from './geoRepository';
import { GROUPS_HOUSING_TABLE } from './groupRepository';
import { housingOwnersTable } from './housingOwnerRepository';
import { localitiesTable } from './localityRepository';
import { OwnerDBO, ownerTable, parseOwnerApi } from './ownerRepository';

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

  const [allowedGeoCodes, intercommunalities] = await Promise.all([
    fetchGeoCodes(opts.filters.establishmentIds ?? []),
    fetchGeoCodes(opts.filters.intercommunalities ?? [])
  ]);
  const defaults = [
    opts.filters.localities,
    intercommunalities,
    allowedGeoCodes
  ].find((array) => array && array.length > 0);
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

  const housingList: HousingDBO[] = await fastListQuery({
    filters: {
      ...opts.filters,
      localities: geoCodes
    },
    includes: opts.includes
  })
    .modify(housingSortQuery(opts.sort))
    .modify(paginationQuery(opts.pagination as PaginationApi));

  logger.debug('housingRepository.find', { housing: housingList.length });
  return housingList.map(parseHousingApi);
}

type StreamOptions = FindOptions & {
  includes?: HousingInclude[];
};

/**
 * @deprecated Should be replaced by {@link betterStream} to get out of
 * the highland library, and allow `opts` to be optional.
 * @param opts
 */
function stream(opts: StreamOptions): Highland.Stream<HousingApi> {
  return highland(fetchGeoCodes(opts.filters?.establishmentIds ?? []))
    .flatMap((geoCodes) => {
      return highland<HousingDBO>(
        fastListQuery({
          filters: {
            ...opts.filters,
            localities: opts.filters.localities?.length
              ? opts.filters.localities
              : geoCodes
          },
          includes: opts.includes
        })
          .modify(paginationQuery(opts.pagination as PaginationApi))
          .stream()
      );
    })
    .map(parseHousingApi);
}

function betterStream(
  opts?: Pick<StreamOptions, 'filters' | 'includes'>
): ReadableStream<HousingApi> {
  return Readable.toWeb(
    fastListQuery({
      filters: opts?.filters ?? {},
      includes: opts?.includes
    })
      .modify(housingSortQuery())
      .stream()
      .map(parseHousingApi)
  );
}

async function count(filters: HousingFiltersApi): Promise<HousingCountApi> {
  logger.debug('Count housing', filters);

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

  const result = await db
    .with(
      'list',
      fastListQuery({
        filters: {
          ...filters,
          localities: geoCodes.toArray()
        },
        includes: ['owner']
      })
    )
    .countDistinct('id as housing')
    .countDistinct('owner_id as owners')
    .from('list')
    .first();

  return {
    housing: Number(result?.housing),
    owners: Number(result?.owners)
  };
}

interface FindOneOptions {
  geoCode?: string | string[] | ReadonlyArray<string>;
  id?: string;
  localId?: string;
  includes?: HousingInclude[];
}

async function findOne(opts: FindOneOptions): Promise<HousingApi | null> {
  const whereOptions = where<FindOneOptions>(['id', 'localId'], {
    table: housingTable
  });

  const housing = await Housing()
    .select(
      `${housingTable}.*`,
      `${buildingTable}.housing_count`,
      `${buildingTable}.vacant_housing_count`,
      `${localitiesTable}.locality_kind`,
      db.raw(
        `(case when st_distancesphere(ST_MakePoint(${housingTable}.latitude_dgfip, ${housingTable}.longitude_dgfip), ST_MakePoint(${banAddressesTable}.latitude, ${banAddressesTable}.longitude)) < 200 then ${banAddressesTable}.latitude else null end) as latitude_ban`
      ),
      db.raw(
        `(case when st_distancesphere(ST_MakePoint(${housingTable}.latitude_dgfip, ${housingTable}.longitude_dgfip), ST_MakePoint(${banAddressesTable}.latitude, ${banAddressesTable}.longitude)) < 200 then ${banAddressesTable}.longitude else null end) as longitude_ban`
      )
    )
    .where(whereOptions(opts))
    .modify((query) => {
      if (opts.geoCode) {
        if (Array.isArray(opts.geoCode)) {
          query.whereIn(`${housingTable}.geo_code`, opts.geoCode);
        } else {
          query.where(`${housingTable}.geo_code`, opts.geoCode);
        }
      }
    })
    .modify(include(opts.includes ?? []))
    .leftJoin(
      localitiesTable,
      `${housingTable}.geo_code`,
      `${localitiesTable}.geo_code`
    )
    .leftJoin(
      buildingTable,
      `${housingTable}.building_id`,
      `${buildingTable}.id`
    )
    .joinRaw(
      `left join ${banAddressesTable} on ${banAddressesTable}.ref_id = ${housingTable}.id and ${banAddressesTable}.address_kind='Housing'`
    )
    .first();
  return housing ? parseHousingApi(housing) : null;
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

  await Housing()
    .insert(housingList.map(formatHousingRecordApi))
    .modify((builder) => {
      if (opts?.onConflict === 'merge') {
        return builder.onConflict(['geo_code', 'local_id']).merge(opts?.merge);
      }
      return builder.onConflict(['geo_code', 'local_id']).ignore();
    });
}

type HousingInclude = 'owner' | 'campaigns' | 'perimeters' | 'precisions';

interface ListQueryOptions {
  filters: HousingFiltersApi;
  includes?: HousingInclude[];
}

function include(includes: HousingInclude[], filters?: HousingFiltersApi) {
  const joins: Record<HousingInclude, (query: Knex.QueryBuilder) => void> = {
    owner: (query) =>
      query
        .join(housingOwnersTable, ownerHousingJoinClause)
        .join(ownerTable, `${housingOwnersTable}.owner_id`, `${ownerTable}.id`)
        .select(`${ownerTable}.id as owner_id`)
        .select(db.raw(`to_json(${ownerTable}.*) AS owner`))
        .leftJoin({ ban: banAddressesTable }, (join) => {
          join
            .on(`${ownerTable}.id`, 'ban.ref_id')
            .andOnVal('address_kind', AddressKinds.Owner);
        })
        .select(db.raw('to_json(ban.*) AS owner_ban_address')),
    campaigns: (query) => {
      query.select('c.campaign_ids').joinRaw(
        `LEFT JOIN LATERAL (
               SELECT coalesce(array_agg(distinct(campaign_id)), ARRAY[]::UUID[]) AS campaign_ids
               FROM ${campaignsHousingTable}, ${campaignsTable}
               WHERE ${housingTable}.id = ${campaignsHousingTable}.housing_id
                 AND ${housingTable}.geo_code = ${campaignsHousingTable}.housing_geo_code
                 AND ${campaignsTable}.id = ${campaignsHousingTable}.campaign_id
                 ${
                   filters?.establishmentIds?.length
                     ? ` AND ${campaignsTable}.establishment_id = ANY(:establishmentIds)`
                     : ''
                 }
             ) c on true`,
        {
          establishmentIds: filters?.establishmentIds ?? []
        }
      );
    },
    perimeters: (query) =>
      query.select('perimeters.perimeter_kind as geo_perimeters').joinRaw(
        `left join lateral (
         select json_agg(distinct(kind)) as perimeter_kind
         from ${geoPerimetersTable} perimeter
         where st_contains(perimeter.geom, ST_SetSRID(ST_Point(${housingTable}.longitude_dgfip, ${housingTable}.latitude_dgfip), 4326))
       ) perimeters on true`
      ),
    precisions: (query) => {
      query
        .joinRaw(
          `LEFT JOIN LATERAL (
          SELECT json_agg(${PRECISION_TABLE}.*) AS precisions
          FROM ${HOUSING_PRECISION_TABLE}
          LEFT JOIN ${PRECISION_TABLE}
            ON ${PRECISION_TABLE}.id = ${HOUSING_PRECISION_TABLE}.precision_id
          WHERE ${housingTable}.geo_code = ${HOUSING_PRECISION_TABLE}.housing_geo_code
            AND ${housingTable}.id = ${HOUSING_PRECISION_TABLE}.housing_id
        ) hp ON true`
        )
        .select('hp.precisions');
    }
  };

  const filterByOwner = [
    filters?.ownerIds,
    filters?.ownerKinds,
    filters?.ownerAges,
    filters?.multiOwners,
    filters?.query
  ].some((filter) => filter?.length);
  if (filterByOwner) {
    includes.push('owner');
  }

  return (query: Knex.QueryBuilder) => {
    uniq(includes).forEach((include) => {
      joins[include](query);
    });
  };
}

async function update(housing: HousingApi): Promise<void> {
  logger.debug('Update housing', housing.id);

  const transaction = getTransaction();
  await Housing(transaction)
    .where({
      // Use the index on the partitioned table
      geo_code: housing.geoCode,
      id: housing.id
    })
    .update({
      occupancy: housing.occupancy,
      occupancy_intended: housing.occupancyIntended ?? null,
      status: housing.status,
      sub_status: housing.subStatus ?? null,
      deprecated_precisions: housing.deprecatedPrecisions?.length
        ? housing.deprecatedPrecisions
        : null,
      deprecated_vacancy_reasons: housing.deprecatedVacancyReasons?.length
        ? housing.deprecatedVacancyReasons
        : null
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

  const fields = compactNullable({
    status: payload.status,
    sub_status: payload.subStatus,
    occupancy: payload.occupancy,
    occupancy_intended: payload.occupancyIntended
  });
  if (Object.keys(fields).length === 0) {
    logger.debug('No fields to update. Skipping...');
    return;
  }

  logger.debug('Updating many housings...', {
    housings: housings.length,
    payload
  });
  await withinTransaction(async (transaction) => {
    await Housing(transaction)
      .whereIn(
        ['geo_code', 'id'],
        housings.map((housing) => [housing.geoCode, housing.id])
      )
      .update(fields);
  });
}

async function remove(housing: HousingApi): Promise<void> {
  const info = Struct.pick(housing, 'geoCode', 'id', 'localId');
  logger.debug('Removing housing...', info);
  await Housing()
    .where({
      geo_code: housing.geoCode,
      id: housing.id
    })
    .delete();
  logger.info('Removed housing.', info);
}

export function ownerHousingJoinClause(query: any) {
  query
    .on(`${housingTable}.id`, `${housingOwnersTable}.housing_id`)
    .andOn(`${housingTable}.geo_code`, `${housingOwnersTable}.housing_geo_code`)
    .andOnVal('rank', 1);
}

function fastListQuery(opts: ListQueryOptions) {
  return db
    .select(`${housingTable}.*`)
    .from(housingTable)
    .modify(include(opts.includes ?? [], opts.filters))
    .modify(
      filteredQuery({
        filters: Struct.omit(opts.filters, 'establishmentIds'),
        includes: opts.includes
      })
    );
}

interface FilteredQueryOptions {
  filters: Omit<HousingFiltersApi, 'establishmentIds'>;
  includes?: HousingInclude[];
}

function filteredQuery(opts: FilteredQueryOptions) {
  const { filters } = opts;
  return (queryBuilder: Knex.QueryBuilder) => {
    if (filters.housingIds?.length) {
      if (filters.all) {
        queryBuilder.whereNotIn(`${housingTable}.id`, filters.housingIds);
      } else {
        queryBuilder.whereIn(`${housingTable}.id`, filters.housingIds);
      }
    }
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
        queryBuilder.whereIn('occupancy', occupancies);
      }
    }
    if (filters.energyConsumption?.length) {
      queryBuilder.where((where) => {
        if (filters.energyConsumption?.includes(null)) {
          where.whereNull('energy_consumption_bdnb');
        }
        const energyConsumptions = filters.energyConsumption?.filter(isNotNull);
        if (energyConsumptions?.length) {
          where.orWhereIn('energy_consumption_bdnb', energyConsumptions);
        }
      });
    }
    if (filters.groupIds?.length) {
      queryBuilder.join(GROUPS_HOUSING_TABLE, (join) => {
        join
          .on(
            `${GROUPS_HOUSING_TABLE}.housing_geo_code`,
            `${housingTable}.geo_code`
          )
          .andOn(`${GROUPS_HOUSING_TABLE}.housing_id`, `${housingTable}.id`)
          .andOnIn(`${GROUPS_HOUSING_TABLE}.group_id`, filters.groupIds ?? []);
      });
    }
    if (filters.campaignIds?.length) {
      queryBuilder.where((where) => {
        if (filters.campaignIds?.includes(null)) {
          where.orWhereNotExists((subquery) => {
            subquery
              .select('*')
              .from(campaignsHousingTable)
              .where(
                `${campaignsHousingTable}.housing_geo_code`,
                db.ref(`${housingTable}.geo_code`)
              )
              .where(
                `${campaignsHousingTable}.housing_id`,
                db.ref(`${housingTable}.id`)
              );
          });
        }
        const ids = filters.campaignIds?.filter((id) => id !== null);
        if (ids?.length) {
          where.orWhereIn(`${housingTable}.id`, (subquery) => {
            subquery
              .select(`${campaignsHousingTable}.housing_id`)
              .from(campaignsHousingTable)
              .join(
                campaignsTable,
                `${campaignsTable}.id`,
                `${campaignsHousingTable}.campaign_id`
              )
              .whereIn(`${campaignsTable}.id`, ids);
          });
        }
      });
    }
    if (filters.campaignCount !== undefined) {
      queryBuilder.whereRaw(`cardinality(${campaignsTable}.campaign_ids) = ?`, [
        filters.campaignCount
      ]);
    }
    if (filters.ownerIds?.length) {
      queryBuilder.whereIn(`${ownerTable}.id`, filters.ownerIds);
    }
    if (filters.ownerKinds?.length) {
      queryBuilder.where((where) => {
        if (filters.ownerKinds?.includes(null)) {
          where.whereNull(`${ownerTable}.kind_class`);
        }
        const ownerKinds = filters.ownerKinds
          ?.filter(isNotNull)
          ?.map((kind) => OWNER_KIND_LABELS[kind]);
        if (ownerKinds?.length) {
          where.orWhereIn(`${ownerTable}.kind_class`, ownerKinds);
        }
      });
    }
    if (filters.ownerAges?.length) {
      queryBuilder.where((where) => {
        if (filters.ownerAges?.includes(null)) {
          where.orWhereNull(`${ownerTable}.birth_date`);
        }
        if (filters.ownerAges?.includes('lt40')) {
          where.orWhereRaw('EXTRACT(YEAR FROM AGE(birth_date)) < 40');
        }
        if (filters.ownerAges?.includes('40to59')) {
          where.orWhereRaw(
            'EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 40 AND 59'
          );
        }
        if (filters.ownerAges?.includes('60to74')) {
          where.orWhereRaw(
            'EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 60 AND 74'
          );
        }
        if (filters.ownerAges?.includes('75to99')) {
          where.orWhereRaw(
            'EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 75 AND 99'
          );
        }
        if (filters.ownerAges?.includes('gte100')) {
          where.orWhereRaw('EXTRACT(YEAR FROM AGE(birth_date)) >= 100');
        }
      });
    }
    if (filters.multiOwners?.length) {
      queryBuilder.where((where) => {
        if (filters.multiOwners?.includes(true)) {
          where.orWhereRaw(
            `(select count(*) from ${housingOwnersTable} oht where rank=1 and ${ownerTable}.id = oht.owner_id) > 1`
          );
        }
        if (filters.multiOwners?.includes(false)) {
          where.orWhereRaw(
            `(select count(*) from ${housingOwnersTable} oht where rank=1 and ${ownerTable}.id = oht.owner_id) = 1`
          );
        }
      });
    }

    if (filters.precisions?.length) {
      queryBuilder.whereIn(`${housingTable}.id`, (subquery) => {
        subquery
          .select(`${HOUSING_PRECISION_TABLE}.housing_id`)
          .from(HOUSING_PRECISION_TABLE)
          .whereIn(
            `${HOUSING_PRECISION_TABLE}.precision_id`,
            filters.precisions ?? []
          );
      });
    }

    if (filters.beneficiaryCounts?.length) {
      // Count secondary owners, e.g., those who have a rank >= 2
      queryBuilder.whereIn(`${housingTable}.id`, (subquery) => {
        subquery
          .select(`${housingOwnersTable}.housing_id`)
          .from(housingOwnersTable)
          // Include the main owner otherwise housings that have
          // no secondary owner will not appear in the GROUP BY clause
          .where(`${housingOwnersTable}.rank`, '>=', 1)
          .groupBy(`${housingOwnersTable}.housing_id`)
          .modify((query) => {
            const counts = filters.beneficiaryCounts
              ?.map(Number)
              ?.filter((count) => !Number.isNaN(count))
              // Beneficiary count = 0 implies there is a main owner
              // but no secondary owner
              ?.map((count) => count + 1);
            if (counts && counts.length) {
              query.havingRaw(`COUNT(*) IN ${toRawArray(counts)}`, [...counts]);
            }
            if (filters.beneficiaryCounts?.includes('gte5')) {
              // At least 6 housing owners (including the main owner)
              query.orHavingRaw('COUNT(*) >= 6');
            }
          });
      });
    }
    if (filters.housingKinds?.length) {
      queryBuilder.whereIn('housing_kind', filters.housingKinds);
    }
    if (filters.housingAreas?.length) {
      queryBuilder.where((where) => {
        if (filters.housingAreas?.includes('lt35')) {
          where.orWhereBetween('living_area', [0, 34]);
        }
        if (filters.housingAreas?.includes('35to74')) {
          where.orWhereBetween('living_area', [35, 74]);
        }
        if (filters.housingAreas?.includes('75to99')) {
          where.orWhereBetween('living_area', [75, 99]);
        }
        if (filters.housingAreas?.includes('gte100')) {
          where.orWhereRaw('living_area >= 100');
        }
      });
    }
    if (filters.roomsCounts?.length) {
      queryBuilder.where((where) => {
        if (filters.roomsCounts?.includes('gte5')) {
          where.orWhere(`${housingTable}.rooms_count`, '>=', 5);
        }
        const roomCounts = filters.roomsCounts
          ?.map(Number)
          ?.filter((count) => !Number.isNaN(count));
        if (roomCounts && roomCounts.length) {
          where.orWhereIn(`${housingTable}.rooms_count`, roomCounts);
        }
      });
    }
    if (filters.cadastralClassifications?.length) {
      queryBuilder.where((where) => {
        if (filters.cadastralClassifications?.includes(null)) {
          where.whereNull(`${housingTable}.cadastral_classification`);
        }
        const cadastralClassifications =
          filters.cadastralClassifications?.filter(isNotNull);
        if (cadastralClassifications?.length) {
          where.orWhereIn(
            `${housingTable}.cadastral_classification`,
            cadastralClassifications
          );
        }
      });
    }
    if (filters.buildingPeriods?.length) {
      queryBuilder.where((where) => {
        if (filters.buildingPeriods?.includes('lt1919')) {
          where.orWhereBetween(`${housingTable}.building_year`, [0, 1918]);
        }
        if (filters.buildingPeriods?.includes('1919to1945')) {
          where.orWhereBetween(`${housingTable}.building_year`, [1919, 1945]);
        }
        if (filters.buildingPeriods?.includes('1946to1990')) {
          where.orWhereBetween(`${housingTable}.building_year`, [1946, 1990]);
        }
        if (filters.buildingPeriods?.includes('gte1991')) {
          where.orWhere(`${housingTable}.building_year`, '>=', 1991);
        }
      });
    }
    if (filters.vacancyYears?.length) {
      queryBuilder.where((where) => {
        if (filters.vacancyYears?.includes('2022')) {
          where.orWhere('vacancy_start_year', 2022);
        }
        if (filters.vacancyYears?.includes('2021')) {
          where.orWhere('vacancy_start_year', 2021);
        }
        if (filters.vacancyYears?.includes('2020')) {
          where.orWhere('vacancy_start_year', 2020);
        }
        if (filters.vacancyYears?.includes('2019')) {
          where.orWhere('vacancy_start_year', 2019);
        }
        if (filters.vacancyYears?.includes('2018to2015')) {
          where.orWhereBetween('vacancy_start_year', [2015, 2018]);
        }
        if (filters.vacancyYears?.includes('2014to2010')) {
          where.orWhereBetween('vacancy_start_year', [2010, 2014]);
        }
        if (filters.vacancyYears?.includes('before2010')) {
          where.orWhere('vacancy_start_year', '<', 2010);
        }
        if (filters.vacancyYears?.includes('missingData')) {
          where.orWhere('vacancy_start_year', 0);
        }
        if (filters.vacancyYears?.includes('inconsistency2022')) {
          where.orWhere('vacancy_start_year', 2022);
        }
      });
    }
    if (filters.isTaxedValues?.length) {
      queryBuilder.where((where) => {
        if (filters.isTaxedValues?.includes(true)) {
          where.orWhereRaw('taxed');
        }
        if (filters.isTaxedValues?.includes(false)) {
          where.orWhereNull('taxed').orWhereRaw('not(taxed)');
        }
      });
    }
    if (filters.ownershipKinds?.length) {
      queryBuilder.where((where) => {
        if (filters.ownershipKinds?.includes('single')) {
          where
            .orWhereNull(`${housingTable}.condominium`)
            .orWhereIn(
              `${housingTable}.condominium`,
              INTERNAL_MONO_CONDOMINIUM_VALUES
            );
        }
        if (filters.ownershipKinds?.includes('co')) {
          where.orWhereIn(
            `${housingTable}.condominium`,
            INTERNAL_CO_CONDOMINIUM_VALUES
          );
        }
        if (filters.ownershipKinds?.includes('other')) {
          where.orWhere((orWhere) => {
            orWhere
              .whereNotNull(`${housingTable}.condominium`)
              .whereNotIn(`${housingTable}.condominium`, [
                ...INTERNAL_MONO_CONDOMINIUM_VALUES,
                ...INTERNAL_CO_CONDOMINIUM_VALUES
              ]);
          });
        }
      });
    }

    if (filters.housingCounts?.length || filters.vacancyRates?.length) {
      queryBuilder.join(
        buildingTable,
        `${housingTable}.building_id`,
        `${buildingTable}.id`
      );
    }

    if (filters.housingCounts?.length) {
      queryBuilder.where((where) => {
        if (filters.housingCounts?.includes('lt5')) {
          where.orWhereRaw('coalesce(housing_count, 0) between 0 and 4');
        }
        if (filters.housingCounts?.includes('5to19')) {
          where.orWhereBetween('housing_count', [5, 19]);
        }
        if (filters.housingCounts?.includes('20to49')) {
          where.orWhereBetween('housing_count', [20, 49]);
        }
        if (filters.housingCounts?.includes('gte50')) {
          where.orWhereRaw('housing_count >= 50');
        }
      });
    }
    if (filters.vacancyRates?.length) {
      queryBuilder.where((where) => {
        const safeExpr =
          'housing_count > 0 AND vacant_housing_count * 100.0 / housing_count';

        if (filters.vacancyRates?.includes('lt20')) {
          where.orWhereRaw(`${safeExpr} < 20`);
        }
        if (filters.vacancyRates?.includes('20to39')) {
          where.orWhereRaw(`${safeExpr} BETWEEN 20 AND 39`);
        }
        if (filters.vacancyRates?.includes('40to59')) {
          where.orWhereRaw(`${safeExpr} BETWEEN 40 AND 59`);
        }
        if (filters.vacancyRates?.includes('60to79')) {
          where.orWhereRaw(`${safeExpr} BETWEEN 60 AND 79`);
        }
        if (filters.vacancyRates?.includes('gte80')) {
          where.orWhereRaw(`${safeExpr} >= 80`);
        }
      });
    }
    if (filters.localities?.length) {
      queryBuilder.whereIn(`${housingTable}.geo_code`, filters.localities);
    }
    if (filters.localityKinds?.length) {
      queryBuilder
        .join(
          localitiesTable,
          `${housingTable}.geo_code`,
          `${localitiesTable}.geo_code`
        )
        .where((where) => {
          if (filters.localityKinds?.includes(null)) {
            where.whereNull(`${localitiesTable}.locality_kind`);
          }
          const localityKinds = filters.localityKinds?.filter(isNotNull);
          if (localityKinds?.length) {
            where.orWhereIn(`${localitiesTable}.locality_kind`, localityKinds);
          }
        });
    }
    if (filters.geoPerimetersIncluded && filters.geoPerimetersIncluded.length) {
      queryBuilder.whereExists((subquery) => {
        subquery
          .select('*')
          .from(geoPerimetersTable)
          // @ts-expect-error: knex types are wrong here
          .whereIn('kind', filters.geoPerimetersIncluded)
          .whereRaw(
            `st_contains(${geoPerimetersTable}.geom, ST_SetSRID(ST_Point(${housingTable}.longitude_dgfip, ${housingTable}.latitude_dgfip), 4326))`
          );
      });
    }
    if (filters.geoPerimetersExcluded && filters.geoPerimetersExcluded.length) {
      queryBuilder.whereNotExists((subquery) => {
        subquery
          .select(`${geoPerimetersTable}.*`)
          .from(geoPerimetersTable)
          // @ts-expect-error: knex types are wrong here
          .whereIn('kind', filters.geoPerimetersExcluded)
          .whereRaw(
            `st_contains(${geoPerimetersTable}.geom, ST_SetSRID(ST_Point(${housingTable}.longitude_dgfip, ${housingTable}.latitude_dgfip), 4326))`
          );
      });
    }
    if (filters.dataFileYearsIncluded?.length) {
      queryBuilder.where((where) => {
        if (filters.dataFileYearsIncluded?.includes(null)) {
          where
            .whereNull('data_file_years')
            .orWhereRaw('cardinality(data_file_years) = 0');
        }
        const dataFileYears = filters.dataFileYearsIncluded?.filter(isNotNull);
        if (dataFileYears?.length) {
          where.orWhereRaw('data_file_years && ?::text[]', [dataFileYears]);
        }
      });
    }
    if (filters.dataFileYearsExcluded?.length) {
      queryBuilder.where((where) => {
        if (filters.dataFileYearsExcluded?.includes(null)) {
          where
            .whereNotNull('data_file_years')
            .whereRaw('cardinality(data_file_years) > 0');
        }
        const dataFileYears = filters.dataFileYearsExcluded?.filter(isNotNull);
        if (dataFileYears?.length) {
          where.orWhereRaw('not(data_file_years && ?::text[])', [
            dataFileYears
          ]);
        }
      });
    }
    if (filters.statusList?.length) {
      queryBuilder.whereIn('status', filters.statusList);
    }
    if (filters.status !== undefined) {
      queryBuilder.where('status', filters.status);
    }
    if (filters.subStatus?.length) {
      queryBuilder.whereIn('sub_status', filters.subStatus);
    }
    if (filters.query?.length) {
      const { query } = filters;
      queryBuilder.where(function (whereBuilder: any) {
        // With more than 20 tokens, the query is likely nor a name neither an address
        if (query.replaceAll(' ', ',').split(',').length < 20) {
          whereBuilder.orWhereRaw(`invariant = ?`, query);
          whereBuilder.orWhereRaw(`local_id = ?`, query);
          whereBuilder.orWhereRaw(
            `upper(unaccent(full_name)) like '%' || upper(unaccent(?)) || '%'`,
            query
          );
          whereBuilder.orWhereRaw(
            `upper(unaccent(full_name)) like '%' || upper(unaccent(?)) || '%'`,
            query?.split(' ').reverse().join(' ')
          );
          whereBuilder.orWhereRaw(
            `upper(unaccent(administrator)) like '%' || upper(unaccent(?)) || '%'`,
            query
          );
          whereBuilder.orWhereRaw(
            `upper(unaccent(administrator)) like '%' || upper(unaccent(?)) || '%'`,
            query?.split(' ').reverse().join(' ')
          );
          whereBuilder.orWhereRaw(
            `replace(upper(unaccent(array_to_string(${housingTable}.address_dgfip, '%'))), ' ', '') like '%' || replace(upper(unaccent(?)), ' ','') || '%'`,
            query
          );
          whereBuilder.orWhereRaw(
            `upper(unaccent(array_to_string(${ownerTable}.address_dgfip, '%'))) like '%' || upper(unaccent(?)) || '%'`,
            query
          );
        }
        whereBuilder.orWhereIn(
          'invariant',
          query
            ?.replaceAll(' ', ',')
            .split(',')
            .map((_) => _.trim())
        );
        whereBuilder.orWhereIn(
          'local_id',
          query
            ?.replaceAll(' ', ',')
            .split(',')
            .map((_) => _.trim())
        );
        whereBuilder.orWhereIn(
          'cadastral_reference',
          query
            ?.replaceAll(' ', ',')
            .split(',')
            .map((_) => _.trim())
        );
      });
    }

    if (filters.lastMutationYears?.includes(null)) {
      queryBuilder.where((where) => {
        where
          .whereNull(`${housingTable}.last_mutation_date`)
          .whereNull(`${housingTable}.last_transaction_date`);
      });
    }

    if (filters.lastMutationYears?.length) {
      queryBuilder.where((where) => {
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

        if (types.includes('donation')) {
          where.orWhere((where1) => {
            where1
              .where(`${housingTable}.last_mutation_type`, 'donation')
              .where((where2) => {
                if (years.length) {
                  where2.orWhereRaw(
                    `EXTRACT(YEAR FROM ${housingTable}.last_mutation_date) = ANY(?)`,
                    [years]
                  );
                }
                if (filters.lastMutationYears?.includes('lte2009')) {
                  where2.whereRaw(
                    `EXTRACT(YEAR FROM ${housingTable}.last_mutation_date) <= 2009`
                  );
                }
              });
          });
        }

        if (types.includes('sale')) {
          where.orWhere((where1) => {
            where1
              .where(`${housingTable}.last_mutation_type`, 'sale')
              .where((where2) => {
                if (years.length) {
                  where2.whereRaw(
                    `EXTRACT(YEAR FROM ${housingTable}.last_transaction_date) = ANY(?)`,
                    [years]
                  );
                }
                if (filters.lastMutationYears?.includes('lte2009')) {
                  where2.whereRaw(
                    `EXTRACT(YEAR FROM ${housingTable}.last_transaction_date) <= 2009`
                  );
                }
              });
          });
        }

        if (types.includes(null)) {
          where.orWhere((where1) => {
            where1
              .whereNull(`${housingTable}.last_mutation_type`)
              .where((where2) => {
                if (years.length) {
                  where2.orWhereRaw(
                    `EXTRACT(YEAR FROM ${housingTable}.last_mutation_date) = ANY(?)`,
                    [years]
                  );
                }
                if (filters.lastMutationYears?.includes('lte2009')) {
                  where2.orWhereRaw(
                    `EXTRACT(YEAR FROM ${housingTable}.last_mutation_date) <= 2009`
                  );
                }
                if (filters.lastMutationYears?.includes(null)) {
                  where2.orWhereNull(`${housingTable}.last_mutation_date`);
                }
              });
          });
        }
      });
    }

    if (filters.lastMutationTypes?.length) {
      queryBuilder.where((where) => {
        const nonNullValues =
          filters.lastMutationTypes?.filter(Predicate.isNotNull) ?? [];
        if (nonNullValues.length) {
          where.whereIn(`${housingTable}.last_mutation_type`, nonNullValues);
        }
        if (filters.lastMutationTypes?.includes(null)) {
          where.orWhereNull(`${housingTable}.last_mutation_type`);
        }
      });
    }
  };
}

const housingSortQuery = (sort?: HousingSortApi) =>
  sortQuery(sort, {
    keys: {
      owner: (query) => query.orderBy(`${ownerTable}.full_name`, sort?.owner),
      occupancy: (query) =>
        query.orderByRaw(`LOWER(${housingTable}.occupancy) ${sort?.occupancy}`),
      status: (query) => query.orderBy(`${housingTable}.status`, sort?.status)
    },
    default: (query) =>
      query.orderBy([`${housingTable}.geo_code`, `${housingTable}.id`])
  });

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
  building_group_id: string | null;
  plot_id: string | null;
  geo_code: string;
  address_dgfip: string[];
  longitude_dgfip: number | null;
  latitude_dgfip: number | null;
  geolocation: string | null;
  cadastral_classification: number | null;
  uncomfortable: boolean;
  vacancy_start_year: number | null;
  housing_kind: HousingKind;
  rooms_count: number | null;
  living_area: number | null;
  cadastral_reference: string | null;
  building_year: number | null;
  taxed: boolean | null;
  /**
   * @deprecated See the tables `precisions` and `housing_precisions`
   */
  deprecated_vacancy_reasons: string[] | null;
  /**
   * @deprecated See {@link data_file_years}
   */
  data_years: number[];
  /**
   * @example ['ff-2023', 'lovac-2024']
   */
  data_file_years: DataFileYear[] | null;
  data_source: HousingSource | null;
  beneficiary_count: number | null;
  building_location: string | null;
  rental_value: number | null;
  condominium: string | null;
  status: HousingStatus;
  sub_status: string | null;
  /**
   * @deprecated See {@link HousingDBO.precisions}
   */
  deprecated_precisions: string[] | null;
  occupancy: Occupancy;
  occupancy_source: Occupancy;
  occupancy_intended: Occupancy | null;
  energy_consumption_bdnb: EnergyConsumption | null;
  energy_consumption_at_bdnb: Date | string | null;
  mutation_date: Date | string | null;
  readonly last_mutation_type: Mutation['type'] | null;
  last_mutation_date: Date | string | null;
  last_transaction_date: Date | string | null;
  last_transaction_value: number | null;
}

export interface HousingDBO extends HousingRecordDBO {
  housing_count?: number;
  vacant_housing_count?: number;
  owner_id: string;
  owner_birth_date?: Date;
  owner?: OwnerDBO;
  owner_ban_address?: AddressDBO;
  locality_kind?: string;
  geo_perimeters?: string[];
  campaign_ids?: string[];
  contact_count?: number;
  last_contact?: Date | string;
  precisions?: Precision[];
  // TODO: fix and fill this type
}

export const parseHousingApi = (housing: HousingDBO): HousingApi => ({
  id: housing.id,
  invariant: housing.invariant,
  localId: housing.local_id,
  plotId: housing.plot_id,
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
  deprecatedVacancyReasons: housing.deprecated_vacancy_reasons,
  deprecatedPrecisions: housing.deprecated_precisions,
  precisions: housing.precisions,
  energyConsumption: housing.energy_consumption_bdnb,
  energyConsumptionAt: housing.energy_consumption_at_bdnb
    ? new Date(housing.energy_consumption_at_bdnb)
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
    : undefined,
  campaignIds: (housing.campaign_ids ?? []).filter((_: any) => _),
  contactCount: Number(housing.contact_count),
  lastContact: housing.last_contact
    ? new Date(housing.last_contact)
    : undefined,
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

type READ_ONLY_FIELDS = 'last_mutation_type';

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
  deprecated_vacancy_reasons: !housing.deprecatedVacancyReasons?.length
    ? null
    : housing.deprecatedVacancyReasons,
  deprecated_precisions: housing.deprecatedPrecisions?.length
    ? housing.deprecatedPrecisions
    : null,
  taxed: housing.taxed,
  condominium: housing.ownershipKind,
  data_years: housing.dataYears,
  data_file_years: housing.dataFileYears,
  status: housing.status,
  sub_status: housing.subStatus ?? null,
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
  last_transaction_value: housing.lastTransactionValue
});

export default {
  find,
  findOne,
  stream,
  betterStream,
  count,
  update,
  updateMany,
  save,
  saveMany,
  remove
};