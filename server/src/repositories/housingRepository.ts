import highland from 'highland';
import { Set } from 'immutable';
import { Knex } from 'knex';
import _ from 'lodash';
import fp from 'lodash/fp';
import { ReadableStream } from 'node:stream/web';
import { Readable } from 'node:stream';

import {
  AddressKinds,
  HousingSource,
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES,
  Occupancy,
  PaginationOptions
} from '@zerologementvacant/models';
import db, { toRawArray, where } from '~/infra/database';
import {
  EnergyConsumptionGradesApi,
  HousingApi,
  HousingRecordApi,
  HousingSortApi
} from '~/models/HousingApi';
import { OwnerDBO, ownerTable, parseOwnerApi } from './ownerRepository';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { localitiesTable } from './localityRepository';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { eventsTable, housingEventsTable } from './eventRepository';
import { geoPerimetersTable } from './geoRepository';
import establishmentRepository from './establishmentRepository';
import { AddressDBO, banAddressesTable } from './banAddressesRepository';
import { logger } from '~/infra/logger';
import { HousingCountApi } from '~/models/HousingCountApi';
import { PaginationApi, paginationQuery } from '~/models/PaginationApi';
import { sortQuery } from '~/models/SortApi';
import { groupsHousingTable } from './groupRepository';
import { housingOwnersTable } from './housingOwnerRepository';
import { campaignsHousingTable } from './campaignHousingRepository';
import { campaignsTable } from './campaignRepository';

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
  includes: HousingInclude[];
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
      .stream()
      .map(parseHousingApi)
  );
}

async function count(filters: HousingFiltersApi): Promise<HousingCountApi> {
  logger.debug('Count housing', filters);

  const [allowedGeoCodes, intercommunalities] = await Promise.all([
    fetchGeoCodes(filters.establishmentIds ?? []),
    fetchGeoCodes(Array.isArray(filters.intercommunalities) ? filters.intercommunalities : [])
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
  await Housing()
    .insert(housingList.map(formatHousingRecordApi))
    .modify((builder) => {
      if (opts?.onConflict === 'merge') {
        return builder.onConflict(['geo_code', 'local_id']).merge(opts?.merge);
      }
      return builder.onConflict(['geo_code', 'local_id']).ignore();
    });
}

type HousingInclude = 'owner' | 'events' | 'campaigns' | 'perimeters';

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
    events: (query) =>
      query.select('events.contact_count', 'events.last_contact').joinRaw(
        `left join lateral (
            select count(${eventsTable}) as contact_count,
                   max(${eventsTable}.created_at) as last_contact
            from ${housingEventsTable}
            join ${eventsTable} on ${eventsTable}.id = ${housingEventsTable}.event_id
            where ${housingTable}.id = ${housingEventsTable}.housing_id
          ) events on true`
      ),
    campaigns: (query) => {
      query.select('campaigns.campaign_ids').joinRaw(
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
             ) campaigns on true`,
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
      )
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

  const filterByCampaign = [
    filters?.campaignIds,
    filters?.campaignsCounts
  ].some((filter) => filter?.length);
  if (filterByCampaign) {
    includes.push('campaigns');
  }

  return (query: Knex.QueryBuilder) => {
    _.uniq(includes).forEach((include) => {
      joins[include](query);
    });
  };
}

async function update(housing: HousingApi): Promise<void> {
  logger.debug('Update housing', housing.id);

  return db(housingTable)
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
      precisions: housing.precisions ?? null,
      vacancy_reasons: housing.vacancyReasons ?? null
    });
}

async function remove(housing: HousingApi): Promise<void> {
  const info = fp.pick(['geoCode', 'id', 'localId'], housing);
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
        filters: fp.omit(['establishmentIds'], opts.filters),
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
      queryBuilder.whereIn(`${housingTable}.id`, filters.housingIds);
    }
    if (filters.occupancies?.length) {
      queryBuilder.whereIn('occupancy', filters.occupancies);
    }
    if (filters.energyConsumption?.length) {
      queryBuilder.whereIn(
        'energy_consumption_bdnb',
        filters.energyConsumption
      );
    }
    if (filters.groupIds?.length) {
      queryBuilder.join(groupsHousingTable, (join) => {
        join
          .on(
            `${groupsHousingTable}.housing_geo_code`,
            `${housingTable}.geo_code`
          )
          .andOn(`${groupsHousingTable}.housing_id`, `${housingTable}.id`)
          .andOnIn(`${groupsHousingTable}.group_id`, filters.groupIds ?? []);
      });
    }
    if (filters.campaignIds?.length) {
      queryBuilder.where((where) => {
        if (filters.campaignIds?.includes(null)) {
          where.orWhereRaw(`cardinality(${campaignsTable}.campaign_ids) = 0`);
        }
        const ids = filters.campaignIds?.filter((id) => id !== null);
        if (ids?.length) {
          where.orWhereRaw(`${campaignsTable}.campaign_ids && ?`, [ids]);
        }
      });
    }
    if (filters.campaignsCounts?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.campaignsCounts?.includes('0')) {
          whereBuilder.orWhereRaw(
            `cardinality(${campaignsTable}.campaign_ids) = 0`
          );
        }
        if (filters.campaignsCounts?.includes('current')) {
          whereBuilder.orWhereRaw(
            `cardinality(${campaignsTable}.campaign_ids) >= 1`
          );
        }
        if (filters.campaignsCounts?.indexOf('1') !== -1) {
          whereBuilder.orWhereRaw(
            `cardinality(${campaignsTable}.campaign_ids)`,
            1
          );
        }
        if (filters.campaignsCounts?.indexOf('2') !== -1) {
          whereBuilder.orWhereRaw(
            `cardinality(${campaignsTable}.campaign_ids)`,
            2
          );
        }
        if (filters.campaignsCounts?.indexOf('gt3') !== -1) {
          whereBuilder.orWhereRaw(
            `cardinality(${campaignsTable}.campaign_ids) >= ?`,
            3
          );
        }
      });
    }

    if (filters.ownerIds?.length) {
      queryBuilder.whereIn(`${ownerTable}.id`, filters.ownerIds);
    }
    if (filters.ownerKinds?.length) {
      queryBuilder.whereIn(`${ownerTable}.kind_class`, filters.ownerKinds);
    }
    if (filters.ownerAges?.length) {
      queryBuilder.where((whereBuilder) => {
        if (filters.ownerAges?.includes('lt40')) {
          whereBuilder.orWhereRaw('EXTRACT(YEAR FROM AGE(birth_date)) < 40');
        }
        if (filters.ownerAges?.includes('40to59')) {
          whereBuilder.orWhereRaw(
            'EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 40 AND 59'
          );
        }
        if (filters.ownerAges?.includes('60to74')) {
          whereBuilder.orWhereRaw(
            'EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 60 AND 74'
          );
        }
        if (filters.ownerAges?.includes('75to99')) {
          whereBuilder.orWhereRaw(
            'EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN 75 AND 99'
          );
        }
        if (filters.ownerAges?.includes('gte100')) {
          whereBuilder.orWhereRaw('EXTRACT(YEAR FROM AGE(birth_date)) >= 100');
        }
      });
    }
    if (filters.multiOwners?.length) {
      queryBuilder.where((where) => {
        if (filters.multiOwners?.includes('true')) {
          where.orWhereRaw(
            `(select count(*) from ${housingOwnersTable} oht where rank=1 and ${ownerTable}.id = oht.owner_id) > 1`
          );
        }
        if (filters.multiOwners?.includes('false')) {
          where.orWhereRaw(
            `(select count(*) from ${housingOwnersTable} oht where rank=1 and ${ownerTable}.id = oht.owner_id) = 1`
          );
        }
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
      queryBuilder.whereIn(
        `${housingTable}.cadastral_classification`,
        filters.cadastralClassifications
      );
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
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.vacancyYears?.includes('2021')) {
          whereBuilder.orWhere('vacancy_start_year', 2021);
        }
        if (filters.vacancyYears?.includes('2020')) {
          whereBuilder.orWhere('vacancy_start_year', 2020);
        }
        if (filters.vacancyYears?.includes('2019')) {
          whereBuilder.orWhere('vacancy_start_year', 2019);
        }
        if (filters.vacancyYears?.includes('2018to2015')) {
          whereBuilder.orWhereBetween('vacancy_start_year', [2015, 2018]);
        }
        if (filters.vacancyYears?.includes('2014to2010')) {
          whereBuilder.orWhereBetween('vacancy_start_year', [2010, 2014]);
        }
        if (filters.vacancyYears?.includes('before2010')) {
          whereBuilder.orWhere('vacancy_start_year', '<', 2010);
        }
        if (filters.vacancyYears?.includes('missingData')) {
          whereBuilder.orWhere('vacancy_start_year', 0);
        }
        if (filters.vacancyYears?.includes('inconsistency2022')) {
          whereBuilder.orWhere('vacancy_start_year', 2022);
        }
      });
    }
    if (filters.isTaxedValues?.length) {
      queryBuilder.where((where) => {
        if (filters.isTaxedValues?.includes('true')) {
          where.orWhereRaw('taxed');
        }
        if (filters.isTaxedValues?.includes('false')) {
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
        if (filters.vacancyRates?.includes('lt20')) {
          where.orWhereRaw('vacant_housing_count * 100 / housing_count < 20');
        }
        if (filters.vacancyRates?.includes('20to39')) {
          where.orWhereRaw(
            'vacant_housing_count * 100 / housing_count between 20 and 39'
          );
        }
        if (filters.vacancyRates?.includes('40to59')) {
          where.orWhereRaw(
            'vacant_housing_count * 100 / housing_count between 40 and 59'
          );
        }
        if (filters.vacancyRates?.includes('60to79')) {
          where.orWhereRaw(
            'vacant_housing_count * 100 / housing_count between 60 and 79'
          );
        }
        if (filters.vacancyRates?.includes('gte80')) {
          where.orWhereRaw('vacant_housing_count * 100 / housing_count >= 80');
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
        .whereIn(`${localitiesTable}.locality_kind`, filters.localityKinds);
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
      queryBuilder.whereRaw('data_file_years && ?::text[]', [
        filters.dataFileYearsIncluded
      ]);
    }
    if (filters.dataFileYearsExcluded?.length) {
      queryBuilder.whereRaw('not(data_file_years && ?::text[])', [
        filters.dataFileYearsExcluded
      ]);
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
  };
}

const housingSortQuery = (sort?: HousingSortApi) =>
  sortQuery(sort, {
    keys: {
      owner: (query) => query.orderBy(`${ownerTable}.full_name`, sort?.owner),
      rawAddress: (query) => {
        query
          .orderBy(`${housingTable}.address_dgfip[2]`, sort?.rawAddress)
          .orderByRaw(
            `array_to_string(((string_to_array(${housingTable}."address_dgfip"[1], ' '))[2:]), '') ${sort?.rawAddress}`
          )
          .orderByRaw(
            `(string_to_array(${housingTable}."address_dgfip"[1], ' '))[1] ${sort?.rawAddress}`
          );
      },
      occupancy: (query) =>
        query.orderByRaw(`LOWER(${housingTable}.occupancy) ${sort?.occupancy}`),
      status: (query) => query.orderBy(`${housingTable}.status`, sort?.status)
    },
    default: (query) => query.orderBy(['geo_code', 'id'])
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
  building_id?: string;
  building_group_id?: string;
  plot_id?: string;
  geo_code: string;
  address_dgfip: string[];
  longitude_dgfip?: number;
  latitude_dgfip?: number;
  geolocation?: string;
  cadastral_classification?: number;
  uncomfortable: boolean;
  vacancy_start_year?: number;
  housing_kind: string;
  rooms_count: number;
  living_area: number;
  cadastral_reference?: string;
  building_year?: number;
  mutation_date?: Date;
  taxed?: boolean;
  vacancy_reasons?: string[];
  /**
   * @deprecated See {@link data_file_years}
   */
  data_years: number[];
  /**
   * @example ['ff-2023', 'lovac-2024']
   */
  data_file_years?: string[];
  data_source: HousingSource | null;
  beneficiary_count?: number;
  building_location?: string;
  rental_value?: number;
  condominium?: string;
  status: HousingStatusApi;
  sub_status?: string | null;
  precisions?: string[];
  occupancy: Occupancy;
  occupancy_source: Occupancy;
  occupancy_intended?: Occupancy;
  energy_consumption_bdnb?: EnergyConsumptionGradesApi;
  energy_consumption_at_bdnb?: Date;
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
  cadastralClassification: housing.cadastral_classification,
  uncomfortable: housing.uncomfortable,
  vacancyStartYear: housing.vacancy_start_year,
  housingKind: housing.housing_kind,
  roomsCount: housing.rooms_count,
  livingArea: housing.living_area,
  cadastralReference: housing.cadastral_reference,
  taxed: housing.taxed,
  vacancyReasons: housing.vacancy_reasons ?? undefined,
  dataYears: housing.data_years,
  dataFileYears: housing.data_file_years ?? [],
  ownershipKind: housing.condominium,
  status: housing.status,
  subStatus: housing.sub_status ?? undefined,
  precisions: housing.precisions ?? undefined,
  energyConsumption: housing.energy_consumption_bdnb,
  energyConsumptionAt: housing.energy_consumption_at_bdnb,
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
  mutationDate: housing.mutation_date ?? null
});

export const formatHousingRecordApi = (
  housingRecordApi: HousingRecordApi
): HousingRecordDBO => ({
  id: housingRecordApi.id,
  invariant: housingRecordApi.invariant,
  local_id: housingRecordApi.localId,
  plot_id: housingRecordApi.plotId,
  building_id: housingRecordApi.buildingId,
  building_group_id: housingRecordApi.buildingGroupId,
  building_location: housingRecordApi.buildingLocation,
  building_year: housingRecordApi.buildingYear,
  address_dgfip: housingRecordApi.rawAddress,
  longitude_dgfip: housingRecordApi.longitude,
  latitude_dgfip: housingRecordApi.latitude,
  rental_value: housingRecordApi.rentalValue,
  beneficiary_count: housingRecordApi.beneficiaryCount,
  geolocation: housingRecordApi.geolocation,
  mutation_date: housingRecordApi.mutationDate ?? undefined,
  geo_code: housingRecordApi.geoCode,
  cadastral_classification: housingRecordApi.cadastralClassification,
  uncomfortable: housingRecordApi.uncomfortable,
  vacancy_start_year: housingRecordApi.vacancyStartYear,
  housing_kind: housingRecordApi.housingKind,
  rooms_count: housingRecordApi.roomsCount,
  living_area: housingRecordApi.livingArea,
  cadastral_reference: housingRecordApi.cadastralReference,
  vacancy_reasons: housingRecordApi.vacancyReasons,
  taxed: housingRecordApi.taxed,
  condominium: housingRecordApi.ownershipKind,
  data_years: housingRecordApi.dataYears,
  data_file_years: housingRecordApi.dataFileYears,
  status: housingRecordApi.status,
  sub_status: housingRecordApi.subStatus,
  precisions: housingRecordApi.precisions,
  energy_consumption_bdnb: housingRecordApi.energyConsumption,
  energy_consumption_at_bdnb: housingRecordApi.energyConsumptionAt,
  occupancy: housingRecordApi.occupancy,
  occupancy_source: housingRecordApi.occupancyRegistered,
  occupancy_intended: housingRecordApi.occupancyIntended,
  data_source: housingRecordApi.source
});

export default {
  find,
  findOne,
  stream,
  betterStream,
  count,
  update,
  save,
  saveMany,
  remove
};
