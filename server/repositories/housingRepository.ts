import fp from 'lodash/fp';
import db, { where } from './db';
import {
  EnergyConsumptionGradesApi,
  getOwnershipKindFromValue,
  HousingApi,
  HousingRecordApi,
  HousingSortApi,
  OccupancyKindApi,
  OwnershipKindsApi,
  OwnershipKindValues,
} from '../models/HousingApi';
import { OwnerDBO, ownerTable, parseOwnerApi } from './ownerRepository';
import { HousingFiltersApi } from '../models/HousingFiltersApi';
import { localitiesTable } from './localityRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';
import { eventsTable, housingEventsTable } from './eventRepository';
import { geoPerimetersTable } from './geoRepository';
import establishmentRepository, {
  establishmentsTable,
} from './establishmentRepository';
import { banAddressesTable } from './banAddressesRepository';
import highland from 'highland';
import { Knex } from 'knex';
import _ from 'lodash';
import validator from 'validator';
import { PaginationOptions } from '../../shared/models/Pagination';
import { logger } from '../utils/logger';
import { HousingCountApi } from '../models/HousingCountApi';
import { PaginationApi, paginationQuery } from '../models/PaginationApi';
import { sortQuery } from '../models/SortApi';
import { groupsHousingTable } from './groupRepository';
import {
  formatHousingOwnerApi,
  HousingOwnerDBO,
  housingOwnersTable,
} from './housingOwnerRepository';
import { HousingOwnerApi } from '../models/HousingOwnerApi';
import isNumeric = validator.isNumeric;

export const housingTable = 'fast_housing';
export const buildingTable = 'buildings';
export const establishmentsLocalitiesTable = 'establishments_localities';

export const Housing = (transaction = db) =>
  transaction<HousingDBO>(housingTable);

export const ReferenceDataYear = 2022;

export const referenceDataYearFromFilters = (filters: HousingFiltersApi) => {
  const dataYearsIncluded =
    filters.dataYearsIncluded && filters.dataYearsIncluded.length > 0
      ? filters.dataYearsIncluded
      : Array.from(Array(ReferenceDataYear + 2).keys());
  const maxDataYearIncluded = _.max(
    _.without(dataYearsIncluded, ...(filters.dataYearsExcluded ?? []))
  );
  return maxDataYearIncluded ? maxDataYearIncluded - 1 : ReferenceDataYear;
};

interface FindOptions extends PaginationOptions {
  filters: HousingFiltersApi;
  sort?: HousingSortApi;
  includes?: HousingInclude[];
}

const find = async (opts: FindOptions): Promise<HousingApi[]> => {
  logger.debug('housingRepository.find', opts);

  const geoCodes = await fetchGeoCodes(opts.filters.establishmentIds ?? []);

  const housingList: HousingDBO[] = await fastListQuery({
    filters: {
      ...opts.filters,
      localities: opts.filters.localities?.length
        ? opts.filters.localities
        : geoCodes,
    },
    includes: opts.includes,
  })
    .modify(housingSortQuery(opts.sort))
    .modify(paginationQuery(opts.pagination as PaginationApi));

  logger.debug('housingRepository.find', { housing: housingList.length });
  return housingList.map(parseHousingApi);
};

/**
 * @deprecated
 * @see {stream}
 */
const streamWithFilters = (
  filters: HousingFiltersApi
): Highland.Stream<HousingApi> => {
  return highland(fetchGeoCodes(filters.establishmentIds ?? []))
    .flatten()
    .collect()
    .flatMap((geoCodes) => {
      return highland<HousingDBO>(
        fastListQuery({
          filters: {
            ...filters,
            localities: filters.localities?.length
              ? filters.localities
              : geoCodes,
          },
          includes: ['owner'],
        })
          .modify(queryHousingEventsJoinClause)
          .stream()
      );
    })
    .map(parseHousingApi);
};

type StreamOptions = FindOptions;

const stream = (opts: StreamOptions): Highland.Stream<HousingApi> => {
  return highland(fetchGeoCodes(opts.filters?.establishmentIds ?? []))
    .flatMap((geoCodes) => {
      return highland<HousingDBO>(
        fastListQuery({
          filters: {
            ...opts.filters,
            localities: opts.filters.localities?.length
              ? opts.filters.localities
              : geoCodes,
          },
          includes: ['owner'],
        })
          .modify(housingSortQuery(opts.sort))
          .modify(paginationQuery(opts.pagination as PaginationApi))
          .stream()
      );
    })
    .map(parseHousingApi);
};

const countVacant = async (): Promise<number> => {
  const value = await db(housingTable)
    .countDistinct(`${housingTable}.id`)
    .modify(whereVacant());

  return Number(value[0].count);
};

function whereVacant(year: number = ReferenceDataYear) {
  return (query: Knex.QueryBuilder) =>
    query
      .andWhere({
        occupancy: OccupancyKindApi.Vacant,
      })
      .andWhere('vacancy_start_year', '<=', year - 2)
      .andWhereRaw('data_years && ?::integer[]', [[year]])
      .andWhereRaw('NOT(data_years && ?::integer[])', [[year + 1]]);
}

const count = async (filters: HousingFiltersApi): Promise<HousingCountApi> => {
  logger.debug('Count housing', filters);

  const geoCodes = await fetchGeoCodes(filters.establishmentIds ?? []);

  const result = await db
    .with(
      'list',
      fastListQuery({
        filters: {
          ...filters,
          localities: filters.localities?.length
            ? filters.localities
            : geoCodes,
        },
        includes: ['owner'],
      })
    )
    .countDistinct('id as housing')
    .countDistinct('owner_id as owners')
    .from('list')
    .first();

  return {
    housing: Number(result?.housing),
    owners: Number(result?.owners),
  };
};

interface FindOneOptions {
  geoCode?: string | string[];
  id?: string;
  localId?: string;
  includes?: HousingInclude[];
}

const findOne = async (opts: FindOneOptions): Promise<HousingApi | null> => {
  const whereOptions = where<FindOneOptions>(['id', 'localId'], {
    table: housingTable,
  });

  const housing = await Housing()
    .select(`${housingTable}.*`)
    .where(whereOptions(opts))
    .modify((query) => {
      if (opts.geoCode) {
        Array.isArray(opts.geoCode)
          ? query.whereIn(`${housingTable}.geo_code`, opts.geoCode)
          : query.where(`${housingTable}.geo_code`, opts.geoCode);
      }
    })
    .modify(include(opts.includes ?? []))
    // TODO: simplify all this stuff
    .select(
      'perimeters.perimeter_kind as geo_perimeters',
      `${buildingTable}.housing_count`,
      `${buildingTable}.vacant_housing_count`,
      `${localitiesTable}.locality_kind`,
      db.raw(
        `(case when st_distancesphere(ST_MakePoint(${housingTable}.latitude, ${housingTable}.longitude), ST_MakePoint(ban.latitude, ban.longitude)) < 200 then ban.latitude else null end) as latitude_ban`
      ),
      db.raw(
        `(case when st_distancesphere(ST_MakePoint(${housingTable}.latitude, ${housingTable}.longitude), ST_MakePoint(ban.latitude, ban.longitude)) < 200 then ban.longitude else null end) as longitude_ban`
      )
    )
    .join(
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
      `left join ${banAddressesTable} as ban on ban.ref_id = ${housingTable}.id and ban.address_kind='Housing'`
    )
    .joinRaw(
      `left join lateral (
         select json_agg(distinct(kind)) as perimeter_kind
         from ${geoPerimetersTable} perimeter
         where st_contains(perimeter.geom, ST_SetSRID(ST_Point(${housingTable}.longitude, ${housingTable}.latitude), 4326))
       ) perimeters on true`
    )
    .modify(queryHousingEventsJoinClause)
    .first();
  return housing ? parseHousingApi(housing) : null;
};

const get = async (
  housingId: string,
  establishmentId: string
): Promise<HousingApi | null> => {
  const establishment = await establishmentRepository.get(establishmentId);
  if (!establishment) {
    return null;
  }

  const housing = await fastListQuery({
    filters: {
      establishmentIds: [establishmentId],
      localities: establishment.geoCodes,
    },
    includes: ['owner'],
  })
    .select(
      'perimeters.perimeter_kind as geo_perimeters',
      `${buildingTable}.housing_count`,
      `${buildingTable}.vacant_housing_count`,
      `${localitiesTable}.locality_kind`,
      db.raw(
        `(case when st_distancesphere(ST_MakePoint(${housingTable}.latitude, ${housingTable}.longitude), ST_MakePoint(ban.latitude, ban.longitude)) < 200 then ban.latitude else null end) as latitude_ban`
      ),
      db.raw(
        `(case when st_distancesphere(ST_MakePoint(${housingTable}.latitude, ${housingTable}.longitude), ST_MakePoint(ban.latitude, ban.longitude)) < 200 then ban.longitude else null end) as longitude_ban`
      )
    )
    .join(
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
      `left join ${banAddressesTable} as ban on ban.ref_id = ${housingTable}.id and ban.address_kind='Housing'`
    )
    .joinRaw(
      `left join lateral (
         select json_agg(distinct(kind)) as perimeter_kind 
         from ${geoPerimetersTable} perimeter
         where st_contains(perimeter.geom, ST_SetSRID(ST_Point(${housingTable}.longitude, ${housingTable}.latitude), 4326))
       ) perimeters on true`
    )
    .modify(queryHousingEventsJoinClause)
    .where(`${housingTable}.id`, housingId)
    .first();

  return housing ? parseHousingApi(housing) : null;
};

interface SaveOptions {
  /**
   * @default 'ignore'
   */
  onConflict?: 'merge' | 'ignore';
  /**
   * @default '*' (all fields)
   */
  merge?: Array<keyof HousingRecordApi>;
}

const save = async (
  housing: HousingRecordApi,
  opts?: SaveOptions
): Promise<void> => {
  logger.debug('Saving housing...', { housing: housing.id });
  await saveMany([housing], opts);
  logger.info(`Housing saved.`, { housing: housing.id });
};

/**
 * Create housing records if they don't exist.
 * Update **all fields** otherwise.
 * @param housingList
 * @param opts
 */
const saveMany = async (
  housingList: HousingRecordApi[],
  opts?: SaveOptions
): Promise<void> => {
  await Housing()
    .insert(housingList.map(formatHousingRecordApi))
    .modify((builder) => {
      if (opts?.onConflict === 'merge') {
        return builder.onConflict(['geo_code', 'local_id']).merge(opts?.merge);
      }
      return builder.onConflict(['geo_code', 'local_id']).ignore();
    });
};

/**
 * @deprecated
 * Housing records should be saved independently of their owners.
 * @see saveMany
 */
const saveManyWithOwner = async (
  housingList: HousingApi[],
  opts?: SaveOptions
): Promise<void> => {
  if (!housingList.length) {
    return;
  }

  await db.transaction(async (transaction) => {
    await transaction(housingTable)
      .insert(housingList.map(formatHousingRecordApi))
      .modify((builder) => {
        if (opts?.onConflict === 'merge') {
          return builder.onConflict('local_id').merge();
        }
        return builder.onConflict('local_id').ignore();
      });

    const newHousingList: HousingApi[] = await transaction(housingTable)
      .whereIn(
        'local_id',
        housingList.map((h) => h.localId)
      )
      .then((results) =>
        housingList.map(
          (h) => <HousingApi>fp.merge(
              h,
              results.find((_) => _.local_id === h.localId)
            )
        )
      );

    const mainOwners: HousingOwnerApi[] = newHousingList.map((housing) => ({
      ...housing.owner,
      rank: 1,
      housingId: housing.id,
      housingGeoCode: housing.geoCode,
    })) as HousingOwnerApi[];
    // FIXME
    const coowners: HousingOwnerApi[] = newHousingList.flatMap((housing) =>
      housing.coowners.map((coowner) => ({
        ...coowner,
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
      }))
    );
    const owners: HousingOwnerApi[] = fp.pipe(
      fp.uniqBy((o: HousingOwnerApi) => o.id + o.housingId)
    )([...mainOwners, ...coowners]);
    const ids = newHousingList.map((housing) => housing.id);

    // Owners should already be present
    const ownersHousing: HousingOwnerDBO[] = owners.map(formatHousingOwnerApi);
    await transaction(housingOwnersTable).whereIn('housing_id', ids).delete();
    await transaction(housingOwnersTable).insert(ownersHousing);
  });
};

type HousingInclude = 'owner';

interface ListQueryOptions {
  filters: HousingFiltersApi;
  includes?: HousingInclude[];
}

function include(includes: HousingInclude[]) {
  const joins: Record<HousingInclude, (query: Knex.QueryBuilder) => void> = {
    owner: (query) =>
      query
        .join(housingOwnersTable, ownerHousingJoinClause)
        .join(ownerTable, `${housingOwnersTable}.owner_id`, `${ownerTable}.id`)
        .select(`${ownerTable}.id as owner_id`)
        .select(db.raw(`to_json(${ownerTable}.*) AS owner`)),
  };

  return (query: Knex.QueryBuilder) => {
    includes.forEach((include) => {
      joins[include](query);
    });
  };
}

const update = async (housing: HousingApi): Promise<void> => {
  logger.debug('Update housing', housing.id);

  return db(housingTable)
    .where({
      // Use the index on the partitioned table
      geo_code: housing.geoCode,
      id: housing.id,
    })
    .update({
      occupancy: housing.occupancy,
      occupancy_intended: housing.occupancyIntended ?? null,
      status: housing.status,
      sub_status: housing.subStatus ?? null,
      precisions: housing.precisions ?? null,
      vacancy_reasons: housing.vacancyReasons ?? null,
    });
};

export const ownerHousingJoinClause = (query: any) => {
  query
    .on(`${housingTable}.id`, `${housingOwnersTable}.housing_id`)
    .andOn(`${housingTable}.geo_code`, `${housingOwnersTable}.housing_geo_code`)
    .andOnVal('rank', 1);
};

export const queryHousingEventsJoinClause = (queryBuilder: any) => {
  queryBuilder
    .joinRaw(
      `
    LEFT JOIN LATERAL (
      SELECT
        COUNT(${eventsTable}) AS contact_count,
        MAX(${eventsTable}.created_at) AS last_contact
      FROM ${housingEventsTable}
      JOIN ${eventsTable} ON ${eventsTable}.id = ${housingEventsTable}.event_id
      WHERE ${housingTable}.id = ${housingEventsTable}.housing_id
    ) events ON true
  `
    )
    .select('events.contact_count', 'events.last_contact');
};

export const queryOwnerHousingWhereClause = (
  queryBuilder: any,
  query?: string
) => {
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
          `replace(upper(unaccent(array_to_string(${housingTable}.raw_address, '%'))), ' ', '') like '%' || replace(upper(unaccent(?)), ' ','') || '%'`,
          query
        );
        whereBuilder.orWhereRaw(
          `upper(unaccent(array_to_string(${ownerTable}.raw_address, '%'))) like '%' || upper(unaccent(?)) || '%'`,
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
};

const fastListQuery = (opts: ListQueryOptions) => {
  return (
    db
      .select(`${housingTable}.*`)
      .from(housingTable)
      .modify(include(opts.includes ?? []))
      // Campaigns
      .select('campaigns.*')
      .joinRaw(
        `LEFT JOIN LATERAL (
           SELECT array_agg(distinct(campaign_id)) AS campaign_ids, ARRAY_LENGTH(array_agg(distinct(campaign_id)), 1) AS campaign_count
           FROM campaigns_housing ch, campaigns c 
           WHERE ${housingTable}.id = ch.housing_id 
           AND ${housingTable}.geo_code = ch.housing_geo_code
           AND c.id = ch.campaign_id
           ${
             opts.filters.campaignIds?.length
               ? ` AND campaign_id = ANY(:campaignIds)`
               : ''
           }
           ${
             opts.filters.establishmentIds?.length
               ? ` AND c.establishment_id = ANY(:establishmentIds)`
               : ''
           }
         ) campaigns ON true`,
        {
          campaignIds: opts.filters.campaignIds ?? [],
          establishmentIds: opts.filters.establishmentIds ?? [],
        }
      )
      .modify(filteredQuery(fp.omit(['establishmentIds'], opts.filters)))
  );
};

const filteredQuery = (filters: HousingFiltersApi) => {
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
        filters.campaignIds,
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
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.ownerAges?.indexOf('lt40') !== -1) {
          whereBuilder.orWhereRaw(
            "date_part('year', current_date) - date_part('year', birth_date) <= 40"
          );
        }
        if (filters.ownerAges?.indexOf('40to60') !== -1) {
          whereBuilder.orWhereRaw(
            "date_part('year', current_date) - date_part('year', birth_date) between 40 and 60"
          );
        }
        if (filters.ownerAges?.indexOf('60to75') !== -1) {
          whereBuilder.orWhereRaw(
            "date_part('year', current_date) - date_part('year', birth_date) between 60 and 75"
          );
        }
        if (filters.ownerAges?.indexOf('75to100') !== -1) {
          whereBuilder.orWhereRaw(
            "date_part('year', current_date) - date_part('year', birth_date) between 75 and 100"
          );
        }
        if (filters.ownerAges?.indexOf('gt100') !== -1) {
          whereBuilder.orWhereRaw(
            "date_part('year', current_date) - date_part('year', birth_date) >= 100"
          );
        }
      });
    }
    if (filters.multiOwners?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.multiOwners?.indexOf('true') !== -1) {
          whereBuilder.orWhereRaw(
            `(select count(*) from owners_housing oht where rank=1 and ${ownerTable}.id = oht.owner_id) > 1`
          );
        }
        if (filters.multiOwners?.indexOf('false') !== -1) {
          whereBuilder.orWhereRaw(
            `(select count(*) from owners_housing oht where rank=1 and ${ownerTable}.id = oht.owner_id) = 1`
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
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.housingAreas?.indexOf('lt35') !== -1) {
          whereBuilder.orWhereBetween('living_area', [0, 35]);
        }
        if (filters.housingAreas?.indexOf('35to75') !== -1) {
          whereBuilder.orWhereBetween('living_area', [35, 75]);
        }
        if (filters.housingAreas?.indexOf('75to100') !== -1) {
          whereBuilder.orWhereBetween('living_area', [75, 100]);
        }
        if (filters.housingAreas?.indexOf('gt100') !== -1) {
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
          filters.roomsCounts?.filter((_) => isNumeric(_))
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
      queryBuilder.where(function (whereBuilder: any) {
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
        if (filters.vacancyDurations?.indexOf('lt2') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            referenceDataYearFromFilters(filters) - 1,
            referenceDataYearFromFilters(filters),
          ]);
        }
        if (filters.vacancyDurations?.indexOf('gt2') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            0,
            referenceDataYearFromFilters(filters) - 2,
          ]);
        }
        if (filters.vacancyDurations?.indexOf('2') !== -1) {
          whereBuilder.orWhere(
            'vacancy_start_year',
            referenceDataYearFromFilters(filters) - 2
          );
        }
        if (filters.vacancyDurations?.indexOf('3to5') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            referenceDataYearFromFilters(filters) - 4,
            referenceDataYearFromFilters(filters) - 3,
          ]);
        }
        if (filters.vacancyDurations?.indexOf('2to5') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            referenceDataYearFromFilters(filters) - 4,
            referenceDataYearFromFilters(filters) - 2,
          ]);
        }
        if (filters.vacancyDurations?.indexOf('5to10') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            referenceDataYearFromFilters(filters) - 9,
            referenceDataYearFromFilters(filters) - 5,
          ]);
        }
        if (filters.vacancyDurations?.indexOf('gt10') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            0,
            referenceDataYearFromFilters(filters) - 10,
          ]);
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
    if (filters.housingCounts?.length) {
      queryBuilder
        .leftJoin(buildingTable, `building_id`, `${buildingTable}.id`)
        .where(function (whereBuilder: any) {
          if (filters.housingCounts?.indexOf('lt5') !== -1) {
            whereBuilder.orWhereRaw(
              'coalesce(housing_count, 0) between 0 and 4'
            );
          }
          if (filters.housingCounts?.indexOf('5to20') !== -1) {
            whereBuilder.orWhereBetween('housing_count', [5, 20]);
          }
          if (filters.housingCounts?.indexOf('20to50') !== -1) {
            whereBuilder.orWhereBetween('housing_count', [20, 50]);
          }
          if (filters.housingCounts?.indexOf('gt50') !== -1) {
            whereBuilder.orWhereRaw('housing_count > 50');
          }
        });
    }
    if (filters.vacancyRates?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.vacancyRates?.indexOf('lt20') !== -1) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) < 20'
          );
        }
        if (filters.vacancyRates?.indexOf('20to40') !== -1) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) between 20 and 40'
          );
        }
        if (filters.vacancyRates?.indexOf('40to60') !== -1) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) between 40 and 60'
          );
        }
        if (filters.vacancyRates?.indexOf('60to80') !== -1) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) between 60 and 80'
          );
        }
        if (filters.vacancyRates?.indexOf('gt80') !== -1) {
          whereBuilder.orWhereRaw(
            'vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) > 80'
          );
        }
      });
    }
    if (filters.localities?.length) {
      queryBuilder.whereIn(`${housingTable}.geo_code`, filters.localities);
    }
    if (filters.localityKinds?.length) {
      queryBuilder
        .join(localitiesTable, 'geo_code', `${localitiesTable}.geo_code`)
        .whereIn(`${localitiesTable}.locality_kind`, filters.localityKinds);
    }
    if (filters.geoPerimetersIncluded && filters.geoPerimetersIncluded.length) {
      queryBuilder.whereExists((builder: any) =>
        builder
          .select('*')
          .from(geoPerimetersTable)
          .whereRaw(
            `st_contains(${geoPerimetersTable}.geom, ST_SetSRID(ST_Point(longitude, latitude), 4326))`
          )
          .whereIn('kind', filters.geoPerimetersIncluded)
      );
    }
    if (filters.geoPerimetersExcluded && filters.geoPerimetersExcluded.length) {
      queryBuilder.whereNotExists(function (whereBuilder: any) {
        whereBuilder
          .select('*')
          .from(geoPerimetersTable)
          .whereRaw(
            `st_contains(${geoPerimetersTable}.geom, ST_SetSRID(ST_Point(longitude, latitude), 4326))`
          )
          .whereIn('kind', filters.geoPerimetersExcluded);
      });
    }
    if (filters.dataYearsIncluded?.length) {
      queryBuilder.whereRaw('data_years && ?::integer[]', [
        filters.dataYearsIncluded,
      ]);
    }
    if (filters.dataYearsExcluded?.length) {
      queryBuilder.whereRaw('not(data_years && ?::integer[])', [
        filters.dataYearsExcluded,
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
};

const housingSortQuery = (sort?: HousingSortApi) =>
  sortQuery(sort, {
    keys: {
      owner: (query) => query.orderBy(`${ownerTable}.full_name`, sort?.owner),
      rawAddress: (query) => {
        query
          .orderBy(`${housingTable}.raw_address[2]`, sort?.rawAddress)
          .orderByRaw(
            `array_to_string(((string_to_array(${housingTable}."raw_address"[1], ' '))[2:]), '') ${sort?.rawAddress}`
          )
          .orderByRaw(
            `(string_to_array(${housingTable}."raw_address"[1], ' '))[1] ${sort?.rawAddress}`
          );
      },
      occupancy: (query) =>
        query.orderBy(`${housingTable}.occupancy`, sort?.occupancy),
      status: (query) => query.orderBy(`${housingTable}.status`, sort?.status),
    },
    default: (query) => query.orderBy(['geo_code', 'id']),
  });

/**
 * Retrieve geo codes as literals to help the query planner,
 * otherwise it would go throughout a lot of irrelevant partitions
 * @param establishmentIds
 */
async function fetchGeoCodes(establishmentIds: string[]): Promise<string[]> {
  const establishments = await establishmentRepository.find({
    ids: establishmentIds,
  });
  return establishments.flatMap((establishment) => establishment.geoCodes);
}

interface HousingRecordDBO {
  id: string;
  invariant: string;
  local_id: string;
  building_id?: string;
  building_group_id?: string;
  raw_address: string[];
  geo_code: string;
  longitude?: number;
  latitude?: number;
  cadastral_classification?: number;
  uncomfortable: boolean;
  vacancy_start_year?: number;
  housing_kind: string;
  rooms_count: number;
  living_area: number;
  cadastral_reference?: string;
  building_year?: number;
  taxed?: boolean;
  vacancy_reasons?: string[];
  data_years: number[];
  building_location?: string;
  ownership_kind?: OwnershipKindsApi;
  status: HousingStatusApi;
  sub_status?: string;
  precisions?: string[];
  energy_consumption?: EnergyConsumptionGradesApi;
  energy_consumption_at?: Date;
  occupancy: OccupancyKindApi;
  occupancy_registered?: OccupancyKindApi;
  occupancy_intended?: OccupancyKindApi;
  latitude_ban?: number;
  longitude_ban?: number;
}

interface HousingDBO extends HousingRecordDBO {
  owner_id: string;
  owner_birth_date?: Date;
  owner?: OwnerDBO;
  coowners: OwnerDBO[];
  // TODO: fix this
  [key: string]: any;
}

export const parseHousingApi = (housing: HousingDBO): HousingApi => ({
  id: housing.id,
  invariant: housing.invariant,
  localId: housing.local_id,
  buildingGroupId: housing.building_group_id,
  rawAddress: housing.raw_address,
  geoCode: housing.geo_code,
  longitude: housing.longitude_ban ?? housing.longitude,
  latitude: housing.latitude_ban ?? housing.latitude,
  cadastralClassification: housing.cadastral_classification,
  uncomfortable: housing.uncomfortable,
  vacancyStartYear: housing.vacancy_start_year,
  housingKind: housing.housing_kind,
  roomsCount: housing.rooms_count,
  livingArea: housing.living_area,
  cadastralReference: housing.cadastral_reference,
  buildingYear: housing.building_year,
  taxed: housing.taxed,
  vacancyReasons: housing.vacancy_reasons ?? undefined,
  dataYears: housing.data_years,
  buildingLocation: housing.building_location,
  ownershipKind: getOwnershipKindFromValue(housing.ownership_kind),
  status: housing.status,
  subStatus: housing.sub_status ?? undefined,
  precisions: housing.precisions ?? undefined,
  energyConsumption: housing.energy_consumption,
  energyConsumptionAt: housing.energy_consumption_at,
  occupancy: housing.occupancy,
  occupancyRegistered: housing.occupancy_registered,
  occupancyIntended: housing.occupancy_intended,
  localityKind: housing.locality_kind,
  geoPerimeters: housing.geo_perimeters,
  owner: housing.owner ? parseOwnerApi(housing.owner) : undefined,
  coowners: [],
  buildingHousingCount: housing.housing_count,
  buildingVacancyRate: housing.vacant_housing_count
    ? Math.round(
        (housing.vacant_housing_count * 100) /
          (housing.housing_count ?? housing.vacant_housing_count)
      )
    : undefined,
  campaignIds: (housing.campaign_ids ?? []).filter((_: any) => _),
  contactCount: Number(housing.contact_count),
  lastContact: housing.last_contact,
});

export const formatHousingRecordApi = (
  housingRecordApi: HousingRecordApi
): HousingRecordDBO => ({
  id: housingRecordApi.id,
  invariant: housingRecordApi.invariant,
  local_id: housingRecordApi.localId,
  building_group_id: housingRecordApi.buildingGroupId,
  raw_address: housingRecordApi.rawAddress,
  geo_code: housingRecordApi.geoCode,
  longitude: housingRecordApi.longitude,
  latitude: housingRecordApi.latitude,
  cadastral_classification: housingRecordApi.cadastralClassification,
  uncomfortable: housingRecordApi.uncomfortable,
  vacancy_start_year: housingRecordApi.vacancyStartYear,
  housing_kind: housingRecordApi.housingKind,
  rooms_count: housingRecordApi.roomsCount,
  living_area: housingRecordApi.livingArea,
  cadastral_reference: housingRecordApi.cadastralReference,
  building_year: housingRecordApi.buildingYear,
  building_location: housingRecordApi.buildingLocation,
  vacancy_reasons: housingRecordApi.vacancyReasons,
  taxed: housingRecordApi.taxed,
  ownership_kind: housingRecordApi.ownershipKind,
  data_years: housingRecordApi.dataYears,
  status: housingRecordApi.status,
  sub_status: housingRecordApi.subStatus,
  precisions: housingRecordApi.precisions,
  energy_consumption: housingRecordApi.energyConsumption,
  energy_consumption_at: housingRecordApi.energyConsumptionAt,
  occupancy: housingRecordApi.occupancy,
  occupancy_registered: housingRecordApi.occupancyRegistered,
  occupancy_intended: housingRecordApi.occupancyIntended,
});

export default {
  find,
  findOne,
  get,
  streamWithFilters,
  stream,
  count,
  countVacant,
  update,
  save,
  saveMany,
  saveManyWithOwner,
};
