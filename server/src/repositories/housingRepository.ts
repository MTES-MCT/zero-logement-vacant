import highland from 'highland';
import { Knex } from 'knex';
import _ from 'lodash';
import fp from 'lodash/fp';
import validator from 'validator';

import { HousingSource, PaginationOptions } from '@zerologementvacant/shared';
import db, { where } from '~/infra/database';
import {
  EnergyConsumptionGradesApi,
  getOwnershipKindFromValue,
  HousingApi,
  HousingRecordApi,
  HousingSortApi,
  OccupancyKindApi,
  OwnershipKindsApi,
  OwnershipKindValues
} from '~/models/HousingApi';
import { OwnerDBO, ownerTable, parseOwnerApi } from './ownerRepository';
import { HousingFiltersApi } from '~/models/HousingFiltersApi';
import { localitiesTable } from './localityRepository';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { eventsTable, housingEventsTable } from './eventRepository';
import { geoPerimetersTable } from './geoRepository';
import establishmentRepository, {
  establishmentsTable
} from './establishmentRepository';
import { AddressDBO, banAddressesTable } from './banAddressesRepository';
import { logger } from '~/infra/logger';
import { HousingCountApi } from '~/models/HousingCountApi';
import { PaginationApi, paginationQuery } from '~/models/PaginationApi';
import { sortQuery } from '~/models/SortApi';
import { groupsHousingTable } from './groupRepository';
import { housingOwnersTable } from './housingOwnerRepository';
import { campaignsHousingTable } from './campaignHousingRepository';
import { campaignsTable } from './campaignRepository';
import { AddressKinds } from '@zerologementvacant/models';
import { ReadableStream } from 'node:stream/web';
import { Readable } from 'node:stream';

export const housingTable = 'fast_housing';
export const buildingTable = 'buildings';

export const Housing = (transaction = db) =>
  transaction<HousingDBO>(housingTable);

export const ReferenceDataYear = 2023;

export const referenceDataYearFromFilters = (filters: HousingFiltersApi) => {
  const dataFileYearsIncluded: string[] =
    filters.dataFileYearsIncluded && filters.dataFileYearsIncluded.length > 0
      ? filters.dataFileYearsIncluded
      : Array.from(Array(ReferenceDataYear + 2).keys()).map(value => `lovac-${value}`);
      const maxDataFileYearIncluded = _.max(
        _.without(
          dataFileYearsIncluded.map(yearString => parseInt(yearString.split('-')[1])),
          ...(filters.dataFileYearsExcluded?.map(yearString => parseInt(yearString.split('-')[1])) ?? [])
        )
      );
  return maxDataFileYearIncluded ? maxDataFileYearIncluded - 1 : ReferenceDataYear;
};

interface FindOptions extends PaginationOptions {
  filters: HousingFiltersApi;
  sort?: HousingSortApi;
  includes?: HousingInclude[];
}

async function find(opts: FindOptions): Promise<HousingApi[]> {
  logger.debug('housingRepository.find', opts);

  const geoCodes = await fetchGeoCodes(opts.filters.establishmentIds ?? []);

  const housingList: HousingDBO[] = await fastListQuery({
    filters: {
      ...opts.filters,
      localities: opts.filters.localities?.length
        ? opts.filters.localities
        : geoCodes
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

  const geoCodes = await fetchGeoCodes(filters.establishmentIds ?? []);

  const result = await db
    .with(
      'list',
      fastListQuery({
        filters: {
          ...filters,
          localities: filters.localities?.length ? filters.localities : geoCodes
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
  geoCode?: string | string[];
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
        Array.isArray(opts.geoCode)
          ? query.whereIn(`${housingTable}.geo_code`, opts.geoCode)
          : query.where(`${housingTable}.geo_code`, opts.geoCode);
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
    campaigns: (query) =>
      query
        .select('campaigns.campaign_ids', 'campaigns.campaign_count')
        .joinRaw(
          `left join lateral (
               select array_agg(distinct(campaign_id)) as campaign_ids,
                      array_length(array_agg(distinct(campaign_id)), 1) AS campaign_count
               from ${campaignsHousingTable}, ${campaignsTable}
               where ${housingTable}.id = ${campaignsHousingTable}.housing_id
                 and ${housingTable}.geo_code = ${campaignsHousingTable}.housing_geo_code
                 and ${campaignsTable}.id = ${campaignsHousingTable}.campaign_id
                 ${
                   filters?.campaignIds?.length
                     ? ` and campaign_id = any(:campaignIds)`
                     : ''
                 }
                 ${
                   filters?.establishmentIds?.length
                     ? ` and ${campaignsTable}.establishment_id = any(:establishmentIds)`
                     : ''
                 }
             ) campaigns on true`,
          {
            campaignIds: filters?.campaignIds ?? [],
            establishmentIds: filters?.establishmentIds ?? []
          }
        ),
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

export function queryOwnerHousingWhereClause(
  queryBuilder: any,
  query?: string
) {
  if (query?.length) {
    queryBuilder.where(function (whereBuilder: any) {
      //With more than 20 tokens, the query is likely nor a name neither an address
      if (query.replaceAll(' ', ',').split(',').length < 20) {
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
        'cadastral_reference',
        query
          ?.replaceAll(' ', ',')
          .split(',')
          .map((_) => _.trim())
      );
    });
  }
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

function filteredQuery(opts: ListQueryOptions) {
  const { filters } = opts;
  return (queryBuilder: Knex.QueryBuilder) => {
    if (filters.housingIds?.length) {
      queryBuilder.whereIn(`${housingTable}.id`, filters.housingIds);
    }
    if (filters.occupancies?.length) {
      queryBuilder.whereIn('occupancy', filters.occupancies);
    }
    if (filters.energyConsumption?.length) {
      queryBuilder.whereIn('energy_consumption', filters.energyConsumption);
    }
    if (filters.establishmentIds?.length) {
      queryBuilder.joinRaw(
        `join ${establishmentsTable} e on geo_code = any(e.localities_geo_code) and e.id in (?)`,
        filters.establishmentIds
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
      queryBuilder.whereRaw('campaigns.campaign_ids && ?', [
        filters.campaignIds
      ]);
    }
    if (filters.campaignsCounts?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.campaignsCounts?.indexOf('0') !== -1) {
          whereBuilder.orWhereNull('campaigns.campaign_count');
        }
        if (filters.campaignsCounts?.indexOf('current') !== -1) {
          whereBuilder.orWhereRaw('campaigns.campaign_count >= 1');
        }
        if (filters.campaignsCounts?.indexOf('1') !== -1) {
          whereBuilder.orWhere('campaigns.campaign_count', 1);
        }
        if (filters.campaignsCounts?.indexOf('2') !== -1) {
          whereBuilder.orWhere('campaigns.campaign_count', 2);
        }
        if (filters.campaignsCounts?.indexOf('gt3') !== -1) {
          whereBuilder.orWhereRaw('campaigns.campaign_count >= ?', 3);
        }
      });
    }

    if (filters.ownerIds?.length) {
      queryBuilder.whereIn(`${ownerTable}.id`, filters.ownerIds);
    }
    if (filters.ownerKinds?.length) {
      queryBuilder.whereIn('owner_kind', filters.ownerKinds);
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
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.multiOwners?.includes('true')) {
          whereBuilder.orWhereRaw(
            `(select count(*) from ${housingOwnersTable} oht where rank=1 and ${ownerTable}.id = oht.owner_id) > 1`
          );
        }
        if (filters.multiOwners?.includes('false')) {
          whereBuilder.orWhereRaw(
            `(select count(*) from ${housingOwnersTable} oht where rank=1 and ${ownerTable}.id = oht.owner_id) = 1`
          );
        }
      });
    }

    if (filters.beneficiaryCounts?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        whereBuilder.whereIn(
          `${housingTable}.beneficiary_count`,
          filters.beneficiaryCounts?.filter((_: string) => !isNaN(+_))
        );
        if (filters.beneficiaryCounts?.indexOf('0') !== -1) {
          whereBuilder.orWhereNull('beneficiary_count');
        }
        if (filters.beneficiaryCounts?.indexOf('gt5') !== -1) {
          whereBuilder.orWhereRaw('beneficiary_count >= 5');
        }
      });
    }
    if (filters.housingKinds?.length) {
      queryBuilder.whereIn('housing_kind', filters.housingKinds);
    }
    if (filters.housingAreas?.length) {
      queryBuilder.where((whereBuilder) => {
        if (filters.housingAreas?.includes('lt35')) {
          whereBuilder.orWhereBetween('living_area', [0, 34]);
        }
        if (filters.housingAreas?.includes('35to74')) {
          whereBuilder.orWhereBetween('living_area', [35, 74]);
        }
        if (filters.housingAreas?.includes('75to99')) {
          whereBuilder.orWhereBetween('living_area', [75, 99]);
        }
        if (filters.housingAreas?.includes('gte100')) {
          whereBuilder.orWhereRaw('living_area >= 100');
        }
      });
    }
    if (filters.roomsCounts?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.roomsCounts?.indexOf('gt5') !== -1) {
          whereBuilder.orWhereRaw('rooms_count >= 5');
        }
        whereBuilder.orWhereIn(
          'rooms_count',
          filters.roomsCounts?.filter((_) => validator.isNumeric(_))
        );
      });
    }
    if (filters.cadastralClassifications?.length) {
      queryBuilder.whereIn(
        'cadastral_classification',
        filters.cadastralClassifications
      );
    }
    if (filters.buildingPeriods?.length) {
      queryBuilder.where((whereBuilder) => {
        if (filters.buildingPeriods?.indexOf('lt1919') !== -1) {
          whereBuilder.orWhereBetween('building_year', [0, 1918]);
        }
        if (filters.buildingPeriods?.indexOf('1919to1945') !== -1) {
          whereBuilder.orWhereBetween('building_year', [1919, 1945]);
        }
        if (filters.buildingPeriods?.indexOf('1946to1990') !== -1) {
          whereBuilder.orWhereBetween('building_year', [1946, 1990]);
        }
        if (filters.buildingPeriods?.indexOf('gt1991') !== -1) {
          whereBuilder.orWhereRaw('building_year >= 1991');
        }
      });
    }
    if (filters.vacancyDurations?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.vacancyDurations?.includes('lt2')) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            referenceDataYearFromFilters(filters) - 1,
            referenceDataYearFromFilters(filters)
          ]);
        }
        if (filters.vacancyDurations?.includes('2')) {
          whereBuilder.orWhere(
            'vacancy_start_year',
            referenceDataYearFromFilters(filters) - 2
          );
        }
        if (filters.vacancyDurations?.includes('gt2')) {
          whereBuilder.orWhere(
            'vacancy_start_year',
            '<',
            referenceDataYearFromFilters(filters) - 2
          );
        }
        if (filters.vacancyDurations?.includes('3to4')) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            referenceDataYearFromFilters(filters) - 4,
            referenceDataYearFromFilters(filters) - 3
          ]);
        }
        if (filters.vacancyDurations?.includes('5to9')) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            referenceDataYearFromFilters(filters) - 9,
            referenceDataYearFromFilters(filters) - 5
          ]);
        }
        if (filters.vacancyDurations?.includes('gte10')) {
          whereBuilder.orWhere(
            'vacancy_start_year',
            '<=',
            referenceDataYearFromFilters(filters) - 10
          );
        }
      });
    }
    if (filters.isTaxedValues?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.isTaxedValues?.indexOf('true') !== -1) {
          whereBuilder.orWhereRaw('taxed');
        }
        if (filters.isTaxedValues?.indexOf('false') !== -1) {
          whereBuilder.orWhereNull('taxed');
          whereBuilder.orWhereRaw('not(taxed)');
        }
      });
    }
    if (filters.ownershipKinds?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.ownershipKinds?.indexOf(OwnershipKindsApi.Single) !== -1) {
          whereBuilder.orWhereNull('ownership_kind');
        }
        if (
          filters.ownershipKinds?.indexOf(OwnershipKindsApi.CoOwnership) !== -1
        ) {
          whereBuilder.orWhereIn(
            'ownership_kind',
            OwnershipKindValues[OwnershipKindsApi.CoOwnership]
          );
        }
        if (filters.ownershipKinds?.indexOf(OwnershipKindsApi.Other) !== -1) {
          whereBuilder.orWhereIn(
            'ownership_kind',
            OwnershipKindValues[OwnershipKindsApi.Other]
          );
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
      queryBuilder.where((whereBuilder) => {
        if (filters.housingCounts?.includes('lt5')) {
          whereBuilder.orWhereRaw('coalesce(housing_count, 0) between 0 and 4');
        }
        if (filters.housingCounts?.includes('5to19')) {
          whereBuilder.orWhereBetween('housing_count', [5, 19]);
        }
        if (filters.housingCounts?.includes('20to49')) {
          whereBuilder.orWhereBetween('housing_count', [20, 49]);
        }
        if (filters.housingCounts?.includes('gte50')) {
          whereBuilder.orWhereRaw('housing_count >= 50');
        }
      });
    }
    if (filters.vacancyRates?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.vacancyRates?.includes('lt20')) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / housing_count < 20'
          );
        }
        if (filters.vacancyRates?.includes('20to39')) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / housing_count between 20 and 39'
          );
        }
        if (filters.vacancyRates?.includes('40to59')) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / housing_count between 40 and 59'
          );
        }
        if (filters.vacancyRates?.includes('60to79')) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / housing_count between 60 and 79'
          );
        }
        if (filters.vacancyRates?.includes('gte80')) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / housing_count >= 80'
          );
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
      queryBuilder.whereExists((builder: any) =>
        builder
          .select('*')
          .from(geoPerimetersTable)
          .whereRaw(
            `st_contains(${geoPerimetersTable}.geom, ST_SetSRID(ST_Point(${housingTable}.longitude, ${housingTable}.latitude), 4326))`
          )
          .whereIn('kind', filters.geoPerimetersIncluded)
      );
    }
    if (filters.geoPerimetersExcluded && filters.geoPerimetersExcluded.length) {
      queryBuilder.whereNotExists(function (whereBuilder: any) {
        whereBuilder
          .select(`${geoPerimetersTable}.*`)
          .from(geoPerimetersTable)
          .whereRaw(
            `st_contains(${geoPerimetersTable}.geom, ST_SetSRID(ST_Point(${housingTable}.longitude, ${housingTable}.latitude), 4326))`
          )
          .whereIn('kind', filters.geoPerimetersExcluded);
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
    queryOwnerHousingWhereClause(queryBuilder, filters.query);
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
        query.orderBy(`${housingTable}.occupancy`, sort?.occupancy),
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
    ids: establishmentIds
  });
  return establishments.flatMap((establishment) => establishment.geoCodes);
}

export interface HousingRecordDBO {
  id: string;
  /**
   * @deprecated See {@link local_id}
   */
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
  condominium?: OwnershipKindsApi;
  status: HousingStatusApi;
  sub_status?: string;
  precisions?: string[];
  occupancy: OccupancyKindApi;
  occupancy_source: OccupancyKindApi;
  occupancy_intended?: OccupancyKindApi;
  energy_consumption_bdnb?: EnergyConsumptionGradesApi;
  energy_consumption_at_bdnb?: Date;
}

export interface HousingDBO extends HousingRecordDBO {
  housing_count?: number;
  vacant_housing_count?: number;
  latitude?: number;
  longitude?: number;
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
  invariant: housing.local_id,
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
  longitude: housing.longitude,
  latitude: housing.latitude,
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
  ownershipKind: getOwnershipKindFromValue(housing.condominium),
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
