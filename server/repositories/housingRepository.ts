import db from './db';
import {
  getOwnershipKindFromValue,
  HousingApi,
  HousingSortApi,
  OccupancyKindApi,
  OwnershipKindsApi,
  OwnershipKindValues,
} from '../models/HousingApi';
import { ownerTable } from './ownerRepository';
import { OwnerApi } from '../models/OwnerApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import {
  HousingFiltersApi,
  HousingFiltersForTotalCountApi,
} from '../models/HousingFiltersApi';
import { localitiesTable } from './localityRepository';
import {
  getHousingStatusApiLabel,
  HousingStatusApi,
  HousingStatusCountApi,
  HousingStatusDurationApi,
} from '../models/HousingStatusApi';
import { MonitoringFiltersApi } from '../models/MonitoringFiltersApi';
import { eventsTable } from './eventRepository';
import { geoPerimetersTable } from './geoRepository';
import { establishmentsTable } from './establishmentRepository';
import { banAddressesTable } from './banAddressesRepository';
import SortApi from '../models/SortApi';

export const housingTable = 'housing';
export const buildingTable = 'buildings';
export const ownersHousingTable = 'owners_housing';

export const ReferenceDataYear = 2021;

export const ownersHousingJoinClause = (query: any) => {
  query
    .on(`${housingTable}.id`, `${ownersHousingTable}.housing_id`)
    .andOnVal('rank', 1);
};

export const queryOwnerHousingWhereClause = (
  queryBuilder: any,
  query?: string
) => {
  if (query?.length) {
    queryBuilder.where(function (whereBuilder: any) {
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
        `upper(unaccent(array_to_string(o.raw_address, '%'))) like '%' || upper(unaccent(?)) || '%'`,
        query
      );
      whereBuilder.orWhereIn(
        'invariant',
        query?.split(',').map((_) => _.trim())
      );
      whereBuilder.orWhereIn(
        'invariant',
        query?.split(' ').map((_) => _.trim())
      );
      whereBuilder.orWhereIn(
        'cadastral_reference',
        query?.split(',').map((_) => _.trim())
      );
      whereBuilder.orWhereIn(
        'cadastral_reference',
        query?.split(' ').map((_) => _.trim())
      );
    });
  }
};

const get = async (housingId: string): Promise<HousingApi> => {
  try {
    return db
      .select(
        `${housingTable}.*`,
        'o.id as owner_id',
        'o.raw_address as owner_raw_address',
        'o.full_name',
        'o.administrator',
        db.raw('json_agg(distinct(campaigns.campaign_id)) as campaign_ids'),
        db.raw(
          'json_agg(distinct(perimeters.perimeter_kind)) as geo_perimeters'
        ),
        `${buildingTable}.housing_count`,
        `${buildingTable}.vacant_housing_count`,
        `${localitiesTable}.locality_kind`,
        db.raw(`max(${eventsTable}.created_at) as last_contact`),
        db.raw(
          `(case when st_distancesphere(ST_MakePoint(${housingTable}.latitude, ${housingTable}.longitude), ST_MakePoint(ban.latitude, ban.longitude)) < 200 then ban.latitude else null end) as latitude_ban`
        ),
        db.raw(
          `(case when st_distancesphere(ST_MakePoint(${housingTable}.latitude, ${housingTable}.longitude), ST_MakePoint(ban.latitude, ban.longitude)) < 200 then ban.longitude else null end) as longitude_ban`
        )
      )
      .from(housingTable)
      .join(
        localitiesTable,
        `${housingTable}.geo_code`,
        `${localitiesTable}.geo_code`
      )
      .leftJoin(ownersHousingTable, ownersHousingJoinClause)
      .leftJoin({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
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
                    select campaign_id as campaign_id, count(*) over() as campaign_count 
                    from campaigns_housing ch, campaigns c 
                    where housing.id = ch.housing_id 
                    and c.id = ch.campaign_id
                ) campaigns on true`
      )
      .joinRaw(
        `left join lateral (
                     select kind as perimeter_kind 
                     from ${geoPerimetersTable} perimeter
                     where st_contains(perimeter.geom, ST_SetSRID( ST_Point(${housingTable}.longitude, ${housingTable}.latitude), 4326))
                     ) perimeters on true`
      )
      .joinRaw(
        `left join ${eventsTable} on ${eventsTable}.housing_id = ${housingTable}.id`
      )
      .groupBy(
        `${housingTable}.id`,
        'o.id',
        `${buildingTable}.id`,
        `${localitiesTable}.id`,
        'ban.ref_id',
        'ban.address_kind'
      )
      .where(`${housingTable}.id`, housingId)
      .first()
      .then((_) => parseHousingApi(_));
  } catch (err) {
    console.error('Getting housing failed', err, housingId);
    throw new Error('Getting housing failed');
  }
};

const filteredQuery = (filters: HousingFiltersApi) => {
  return (queryBuilder: any) => {
    if (filters.occupancies?.length) {
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.occupancies?.includes(OccupancyKindApi.Vacant)) {
          whereBuilder.orWhereRaw('occupancy = ? and vacancy_start_year <= ?', [
            OccupancyKindApi.Vacant,
            ReferenceDataYear - 2,
          ]);
        }
        if (filters.occupancies?.includes(OccupancyKindApi.Rent)) {
          whereBuilder.orWhere('occupancy', OccupancyKindApi.Rent);
        }
      });
    }
    if (filters.energyConsumption?.length) {
      queryBuilder.whereIn('energy_consumption', filters.energyConsumption);
    }
    if (filters.energyConsumptionWorst?.length) {
      queryBuilder.whereIn(
        'energy_consumption_worst',
        filters.energyConsumptionWorst
      );
    }
    if (filters.establishmentIds?.length) {
      queryBuilder.joinRaw(
        `join ${establishmentsTable} e on geo_code  = any(e.localities_geo_code) and e.id in (?)`,
        filters.establishmentIds
      );
    }
    if (filters.campaignIds?.length) {
      queryBuilder.whereIn('campaigns.campaign_id', filters.campaignIds);
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
      queryBuilder.whereIn('o.id', filters.ownerIds);
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
            `(select count(*) from owners_housing oht where rank=1 and o.id = oht.owner_id) > 1`
          );
        }
        if (filters.multiOwners?.indexOf('false') !== -1) {
          whereBuilder.orWhereRaw(
            `(select count(*) from owners_housing oht where rank=1 and o.id = oht.owner_id) = 1`
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
          whereBuilder.orWhereNull(`${housingTable}.beneficiary_count`);
        }
        if (filters.beneficiaryCounts?.indexOf('gt5') !== -1) {
          whereBuilder.orWhereRaw(`${housingTable}.beneficiary_count >= 5`);
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
        whereBuilder.orWhereIn('rooms_count', filters.roomsCounts);
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
            ReferenceDataYear - 1,
            ReferenceDataYear,
          ]);
        }
        if (filters.vacancyDurations?.indexOf('2to5') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            ReferenceDataYear - 4,
            ReferenceDataYear - 2,
          ]);
        }
        if (filters.vacancyDurations?.indexOf('5to10') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            ReferenceDataYear - 9,
            ReferenceDataYear - 5,
          ]);
        }
        if (filters.vacancyDurations?.indexOf('gt10') !== -1) {
          whereBuilder.orWhereBetween('vacancy_start_year', [
            0,
            ReferenceDataYear - 10,
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
      queryBuilder.where(function (whereBuilder: any) {
        if (filters.housingCounts?.indexOf('lt5') !== -1) {
          whereBuilder.orWhereRaw('coalesce(housing_count, 0) between 0 and 4');
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
      queryBuilder.whereIn('geo_code', filters.localities);
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
      queryBuilder
        .joinRaw(
          `left join ${geoPerimetersTable} as perimeter_inc on st_contains(perimeter_inc.geom, ST_SetSRID( ST_Point(${housingTable}.longitude, ${housingTable}.latitude), 4326))`
        )
        .whereRaw(`? && array[perimeter_inc.kind]::text[]`, [
          filters.geoPerimetersIncluded,
        ]);
    }
    if (filters.geoPerimetersExcluded && filters.geoPerimetersExcluded.length) {
      queryBuilder.whereNotExists(function (whereBuilder: any) {
        whereBuilder
          .select('*')
          .from(geoPerimetersTable)
          .whereRaw(
            `st_contains(${geoPerimetersTable}.geom, ST_SetSRID(ST_Point(${housingTable}.longitude, ${housingTable}.latitude), 4326))`
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
    if (filters.status?.length) {
      queryBuilder.whereIn(`${housingTable}.status`, filters.status);
    }
    if (filters.subStatus?.length) {
      queryBuilder.whereIn(`${housingTable}.sub_status`, filters.subStatus);
    }
    queryOwnerHousingWhereClause(queryBuilder, filters.query);
  };
};

const listQuery = (establishmentIds?: string[]) =>
  db
    .select(
      `${housingTable}.*`,
      'o.id as owner_id',
      'o.raw_address as owner_raw_address',
      'o.full_name',
      'o.administrator',
      db.raw('json_agg(distinct(campaigns.campaign_id)) as campaign_ids'),
      db.raw(`max(${eventsTable}.created_at) as last_contact`)
    )
    .from(housingTable)
    .join(ownersHousingTable, ownersHousingJoinClause)
    .join({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
    .leftJoin(
      buildingTable,
      `${housingTable}.building_id`,
      `${buildingTable}.id`
    )
    .joinRaw(
      `left join lateral (
                    select campaign_id as campaign_id, count(*) over() as campaign_count 
                    from campaigns_housing ch, campaigns c 
                    where housing.id = ch.housing_id 
                    and c.id = ch.campaign_id
                    ${
                      establishmentIds?.length
                        ? ` and c.establishment_id in (?)`
                        : ''
                    }
                ) campaigns on true`,
      establishmentIds ?? []
    )
    .joinRaw(
      `left join ${eventsTable} on ${eventsTable}.housing_id = ${housingTable}.id`
    )
    .groupBy(`${housingTable}.id`, 'o.id');

const listWithFilters = async (
  filters: HousingFiltersApi
): Promise<HousingApi[]> => {
  return listQuery(filters.establishmentIds)
    .modify(filteredQuery(filters))
    .then((_) => _.map((result: any) => parseHousingApi(result)));
};
const paginatedListWithFilters = async (
  filters: HousingFiltersApi,
  filtersForTotalCount: HousingFiltersForTotalCountApi,
  page: number,
  perPage: number,
  sort?: HousingSortApi
): Promise<PaginatedResultApi<HousingApi>> => {
  const filterQuery = listQuery(filters.establishmentIds).modify(
    filteredQuery(filters)
  );

  if (sort) {
    SortApi.use(sort, {
      keys: {
        owner: () => filterQuery.orderBy('o.full_name', sort.owner),
        rawAddress: () => {
          filterQuery
            .orderBy(`${housingTable}.raw_address[2]`, sort.rawAddress)
            .orderByRaw(
              `array_to_string(((string_to_array("${housingTable}"."raw_address"[1], ' '))[2:]), '') ${sort.rawAddress}`
            )
            .orderByRaw(
              `(string_to_array("${housingTable}"."raw_address"[1], ' '))[1] ${sort.rawAddress}`
            );
        },
      },
    });
  }

  return Promise.all([
    filterQuery.modify((queryBuilder: any) => {
      if (page && perPage) {
        queryBuilder.offset((page - 1) * perPage).limit(perPage);
      }
    }),
    countWithFilters(filters),
    countWithFilters(filtersForTotalCount),
  ]).then(
    ([results, filteredCount, totalCount]) =>
      <PaginatedResultApi<HousingApi>>{
        entities: results.map((result: any) => parseHousingApi(result)),
        filteredCount,
        totalCount,
        page,
        perPage,
      }
  );
};

const countWithFilters = async (
  filters: HousingFiltersApi
): Promise<number> => {
  try {
    return db(housingTable)
      .countDistinct(`${housingTable}.id`)
      .join(ownersHousingTable, ownersHousingJoinClause)
      .join({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
      .joinRaw(
        `left join lateral (
                    select campaign_id as campaign_id, count(*) over() as campaign_count
                    from campaigns_housing ch, campaigns c
                    where housing.id = ch.housing_id
                    and c.id = ch.campaign_id
                    ${
                      filters.establishmentIds?.length
                        ? ` and c.establishment_id in (?)`
                        : ''
                    }
                ) campaigns on true`,
        filters.establishmentIds ?? []
      )
      .leftJoin(
        buildingTable,
        `${housingTable}.building_id`,
        `${buildingTable}.id`
      )
      .modify(filteredQuery(filters))
      .then((_) => Number(_[0].count));
  } catch (err) {
    console.error('Listing housing failed', err);
    throw new Error('Listing housing failed');
  }
};

const listByIds = async (ids: string[]): Promise<HousingApi[]> => {
  try {
    return db
      .select(
        `${housingTable}.*`,
        'o.id as owner_id',
        'o.raw_address as owner_raw_address',
        'o.full_name',
        'o.administrator'
      )
      .from(housingTable)
      .join(ownersHousingTable, ownersHousingJoinClause)
      .join({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
      .whereIn(`${housingTable}.id`, ids)
      .then((_) => _.map((_) => parseHousingApi(_)));
  } catch (err) {
    console.error('Listing housing failed', err);
    throw new Error('Listing housing failed');
  }
};

const updateHousingList = async (
  housingIds: string[],
  status: HousingStatusApi,
  subStatus?: string,
  precisions?: string[],
  vacancyReasons?: string[]
): Promise<HousingApi[]> => {
  console.log('update housing list', housingIds.length);

  try {
    return db(housingTable)
      .whereIn('id', housingIds)
      .update({
        status: status,
        sub_status: subStatus ?? null,
        precisions: precisions ?? null,
        vacancy_reasons: vacancyReasons ?? null,
      })
      .returning('*');
  } catch (err) {
    console.error(
      'Updating campaign housing list failed',
      err,
      housingIds.length
    );
    throw new Error('Updating campaign housing list failed');
  }
};

const countByStatusWithFilters = async (
  filters: MonitoringFiltersApi
): Promise<HousingStatusCountApi[]> => {
  try {
    return db(housingTable)
      .select('status', 'precisions', 'sub_status', db.raw('count(*)'))
      .groupBy('status')
      .groupBy('sub_status')
      .groupBy('precisions')
      .modify(monitoringQueryFilter(filters))
      .then((_) =>
        _.map(
          (result: any) =>
            <HousingStatusCountApi>{
              status: result.status,
              subStatus: result.sub_status,
              precisions: result.precisions?.filter((_: any) => _?.length),
              count: result.count,
            }
        )
      );
  } catch (err) {
    console.error('Count housing by status failed', err);
    throw new Error('Count housing by status failed');
  }
};

const durationByStatusWithFilters = async (
  filters: MonitoringFiltersApi
): Promise<HousingStatusDurationApi[]> => {
  try {
    return db
      .select(
        'status',
        db.raw('avg(current_timestamp - created_at)'),
        db.raw(
          `count(created_at) filter ( where created_at < current_timestamp  - interval '3 months')`
        )
      )
      .from(
        db
          .from(housingTable)
          .select(
            'status',
            db.raw(`max(${eventsTable}.created_at) as created_at`)
          )
          .join(eventsTable, `${housingTable}.id`, 'housing_id')
          .whereRaw(
            `${eventsTable}.kind = (case when status = 1 then '1' else '2' end)`
          )
          .andWhereRaw(
            `${eventsTable}.content like
                        (case
                             when status = ${
                               HousingStatusApi.Waiting
                             } then '%Ajout dans la campagne%'
                             when status = ${
                               HousingStatusApi.FirstContact
                             } then '%${getHousingStatusApiLabel(
              HousingStatusApi.FirstContact
            )}%'
                             when status = ${
                               HousingStatusApi.InProgress
                             } then '%${getHousingStatusApiLabel(
              HousingStatusApi.InProgress
            )}%'
                             when status = ${
                               HousingStatusApi.NotVacant
                             } then '%${getHousingStatusApiLabel(
              HousingStatusApi.NotVacant
            )}%'
                             when status = ${
                               HousingStatusApi.NoAction
                             } then '%${getHousingStatusApiLabel(
              HousingStatusApi.NoAction
            )}%'
                             when status = ${
                               HousingStatusApi.Exit
                             } then '%${getHousingStatusApiLabel(
              HousingStatusApi.Exit
            )}%'
                        end) `
          )
          .groupBy(`${housingTable}.id`)
          .modify(monitoringQueryFilter(filters))
          .as('max')
      )
      .groupBy('status')
      .then((_) =>
        _.map(
          (result: any) =>
            <HousingStatusDurationApi>{
              status: result.status,
              averageDuration: result.avg,
              unchangedFor3MonthsCount: Number(result.count),
            }
        )
      );
  } catch (err) {
    console.error('Duration housing by status failed', err);
    throw new Error('Duration housing by status failed');
  }
};

const monitoringQueryFilter =
  (filters: MonitoringFiltersApi) => (queryBuilder: any) => {
    if (filters.establishmentIds?.length) {
      queryBuilder
        .joinRaw(
          `join ${establishmentsTable} e on geo_code  = any (e.localities_geo_code)`
        )
        .whereIn('e.id', filters.establishmentIds);
    }
    if (filters.dataYears?.length) {
      queryBuilder.whereRaw('data_years && ?::integer[]', [filters.dataYears]);
    }
  };

const parseHousingApi = (result: any) =>
  <HousingApi>{
    id: result.id,
    invariant: result.invariant,
    cadastralReference: result.cadastral_reference,
    buildingLocation: result.building_location,
    geoCode: result.geo_code,
    rawAddress: result.raw_address,
    latitude: result.latitude_ban ?? result.latitude,
    longitude: result.longitude_ban ?? result.longitude,
    localityKind: result.locality_kind,
    geoPerimeters: result.geo_perimeters,
    owner: <OwnerApi>{
      id: result.owner_id,
      rawAddress: result.owner_raw_address,
      fullName: result.full_name,
      administrator: result.administrator,
    },
    livingArea: result.living_area,
    housingKind: result.housing_kind,
    roomsCount: result.rooms_count,
    buildingYear: result.building_year,
    vacancyStartYear: result.vacancy_start_year,
    vacancyReasons: result.vacancy_reasons,
    uncomfortable: result.uncomfortable,
    cadastralClassification: result.cadastral_classification,
    taxed: result.taxed,
    ownershipKind: getOwnershipKindFromValue(result.ownership_kind),
    buildingHousingCount: result.housing_count,
    buildingVacancyRate: result.vacant_housing_count
      ? Math.round(
          (result.vacant_housing_count * 100) /
            (result.housing_count ?? result.vacant_housing_count)
        )
      : undefined,
    dataYears: result.data_years,
    campaignIds: (result.campaign_ids ?? []).filter((_: any) => _),
    status: result.status,
    subStatus: result.sub_status,
    precisions: result.precisions,
    lastContact: result.last_contact,
    occupancy: result.occupancy,
    energyConsumption: result.energy_consumption,
    energyConsumptionWorst: result.energy_consumption_worst,
  };

const formatHousingApi = (housingApi: HousingApi) => ({
  id: housingApi.id,
  invariant: housingApi.invariant,
  local_id: housingApi.localId,
  cadastral_reference: housingApi.cadastralReference,
  building_location: housingApi.buildingLocation,
  geo_code: housingApi.geoCode,
  raw_address: housingApi.rawAddress,
  latitude: housingApi.latitude,
  longitude: housingApi.longitude,
  living_area: housingApi.livingArea,
  housing_kind: housingApi.housingKind,
  rooms_count: housingApi.roomsCount,
  building_year: housingApi.buildingYear,
  vacancy_start_year: housingApi.vacancyStartYear,
  vacancy_reasons: housingApi.vacancyReasons,
  uncomfortable: housingApi.uncomfortable,
  cadastral_classification: housingApi.cadastralClassification,
  taxed: housingApi.taxed,
  ownership_kind: housingApi.ownershipKind,
  data_years: housingApi.dataYears,
  status: housingApi.status,
  sub_status: housingApi.subStatus,
  precisions: housingApi.precisions,
});

export default {
  get,
  listWithFilters,
  paginatedListWithFilters,
  countWithFilters,
  listByIds,
  updateHousingList,
  countByStatusWithFilters,
  durationByStatusWithFilters,
  formatHousingApi,
};
