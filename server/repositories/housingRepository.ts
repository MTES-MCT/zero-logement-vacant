import fp from 'lodash/fp';
import db from './db';
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
import ownerRepository, {
  formatHousingOwnerApi,
  HousingOwnerDBO,
  OwnerDBO,
  ownerTable,
} from './ownerRepository';
import { HousingPaginatedResultApi } from '../models/PaginatedResultApi';
import {
  HousingFiltersApi,
  HousingFiltersForTotalCountApi,
} from '../models/HousingFiltersApi';
import { localitiesTable } from './localityRepository';
import {
  HousingStatusApi,
  HousingStatusCountApi,
} from '../models/HousingStatusApi';
import { MonitoringFiltersApi } from '../models/MonitoringFiltersApi';
import { eventsTable, housingEventsTable } from './eventRepository';
import { geoPerimetersTable } from './geoRepository';
import { establishmentsTable } from './establishmentRepository';
import { banAddressesTable } from './banAddressesRepository';
import SortApi from '../models/SortApi';
import {
  isPaginationEnable,
  PaginationApi,
  paginationQuery,
} from '../models/PaginationApi';
import highland from 'highland';
import { HousingOwnerApi } from '../models/OwnerApi';
import { Knex } from 'knex';
import _ from 'lodash';
import validator from 'validator';
import isNumeric = validator.isNumeric;

export const housingTable = 'housing';
export const buildingTable = 'buildings';
export const ownersHousingTable = 'owners_housing';

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

export const ownersHousingJoinClause = (query: any) => {
  query
    .on(`${housingTable}.id`, `${ownersHousingTable}.housing_id`)
    .andOnVal('rank', 1);
};
export const queryHousingEventsJoinClause = (queryBuilder: any) => {
  queryBuilder
    .leftJoin(
      housingEventsTable,
      `${housingEventsTable}.housing_id`,
      `${housingTable}.id`
    )
    .leftJoin(
      eventsTable,
      `${eventsTable}.id`,
      `${housingEventsTable}.event_id`
    );
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
          `upper(unaccent(array_to_string(o.raw_address, '%'))) like '%' || upper(unaccent(?)) || '%'`,
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

interface SaveOptions {
  onConflict?: 'merge' | 'ignore';
}

const saveMany = async (
  housingList: HousingApi[],
  opts?: SaveOptions
): Promise<void> => {
  if (!housingList.length) {
    return;
  }

  const mainOwners: HousingOwnerApi[] = housingList.map((housing) => ({
    ...housing.owner,
    rank: 1,
    housingId: housing.id,
  }));
  const coowners = housingList.flatMap((housing) =>
    housing.coowners.map((coowner) => ({
      ...coowner,
      housingId: housing.id,
    }))
  );
  const owners: HousingOwnerApi[] = fp.pipe(fp.uniqBy('id'))([
    ...mainOwners,
    ...coowners,
  ]);
  const ids = housingList.map((housing) => housing.id);

  await db.transaction(async (transaction) => {
    await transaction(housingTable)
      .insert(housingList.map(formatHousingRecordApi))
      .modify((builder) => {
        if (opts?.onConflict === 'merge') {
          return builder.onConflict('local_id').merge();
        }
        return builder.onConflict('local_id').ignore();
      });

    // Owners should already be present
    const ownersHousing: HousingOwnerDBO[] = owners.map(formatHousingOwnerApi);
    await transaction(ownersHousingTable).whereIn('housing_id', ids).delete();
    await transaction(ownersHousingTable).insert(ownersHousing);
  });
};

const get = async (
  housingId: string,
  establishmentId: string
): Promise<HousingApi | null> => {
  const housing = await db
    .select(
      `${housingTable}.*`,
      'o.id as owner_id',
      'o.raw_address as owner_raw_address',
      'o.full_name',
      'o.administrator',
      db.raw('json_agg(distinct(campaigns.campaign_id)) as campaign_ids'),
      db.raw('json_agg(distinct(perimeters.perimeter_kind)) as geo_perimeters'),
      `${buildingTable}.housing_count`,
      `${buildingTable}.vacant_housing_count`,
      `${localitiesTable}.locality_kind`,
      db.raw(`count(${eventsTable}) as contact_count`),
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
    .joinRaw(
      `join ${establishmentsTable} on ${housingTable}.geo_code = any(localities_geo_code)`
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
                    and c.establishment_id = (?)
                ) campaigns on true`,
      establishmentId
    )
    .joinRaw(
      `left join lateral (
                     select kind as perimeter_kind 
                     from ${geoPerimetersTable} perimeter
                     where st_contains(perimeter.geom, ST_SetSRID( ST_Point(${housingTable}.longitude, ${housingTable}.latitude), 4326))
                     ) perimeters on true`
    )
    .modify(queryHousingEventsJoinClause)
    .groupBy(
      `${housingTable}.id`,
      'o.id',
      `${buildingTable}.id`,
      `${localitiesTable}.id`,
      'ban.ref_id',
      'ban.address_kind'
    )
    .where(`${establishmentsTable}.id`, establishmentId)
    .andWhere(`${housingTable}.id`, housingId)
    .first();

  return housing ? parseHousingApi(housing) : null;
};

const filteredQuery = (filters: HousingFiltersApi) => {
  return (queryBuilder: any) => {
    queryBuilder.where(function (whereBuilder: any) {
      if (
        !filters.occupancies?.length ||
        filters.occupancies?.includes(OccupancyKindApi.Vacant)
      ) {
        whereBuilder.orWhereRaw('occupancy = ? and vacancy_start_year <= ?', [
          OccupancyKindApi.Vacant,
          referenceDataYearFromFilters(filters) - 2,
        ]);
      }
      if (
        !filters.occupancies?.length ||
        filters.occupancies?.includes(OccupancyKindApi.Rent)
      ) {
        whereBuilder.orWhere('occupancy', OccupancyKindApi.Rent);
      }
    });
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
      'o.email',
      'o.phone',
      db.raw('json_agg(distinct(campaigns.campaign_id)) as campaign_ids'),
      db.raw(`count(${eventsTable}) as contact_count`),
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
    .modify(queryHousingEventsJoinClause)
    .groupBy(`${housingTable}.id`, 'o.id');

const listWithFilters = async (
  filters: HousingFiltersApi
): Promise<HousingApi[]> => {
  return listQuery(filters.establishmentIds)
    .modify(filteredQuery(filters))
    .then((_) => _.map((result: any) => parseHousingApi(result)));
};

const stream = (): Highland.Stream<HousingApi> => {
  const stream = db
    .select(
      `${housingTable}.*`,
      'o.id as owner_id',
      'o.birth_date as owner_birth_date',
      'o.raw_address as owner_raw_address',
      'o.full_name',
      'o.administrator',
      'o.email',
      'o.phone'
    )
    .from(housingTable)
    .join(ownersHousingTable, ownersHousingJoinClause)
    .join({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
    .modify(whereVacant())
    .stream();

  return highland<HousingDBO>(stream)
    .map(parseHousingApi)
    .flatMap((housing) => {
      return highland<HousingApi>(
        ownerRepository.listByHousing(housing.id).then(
          (owners: HousingOwnerApi[]): HousingApi => ({
            ...housing,
            coowners: owners.filter((owner) => owner.rank > 1),
          })
        )
      );
    });
};

const paginatedListWithFilters = async (
  filters: HousingFiltersApi,
  filtersForTotalCount: HousingFiltersForTotalCountApi,
  pagination?: PaginationApi,
  sort?: HousingSortApi
): Promise<HousingPaginatedResultApi> => {
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
    filterQuery.modify(paginationQuery(pagination)),
    countWithFilters(filters),
    countWithFilters(filtersForTotalCount),
  ]).then(
    ([results, filteredCounts, totalCounts]) =>
      <HousingPaginatedResultApi>{
        entities: results.map((result: any) => parseHousingApi(result)),
        filteredCount: filteredCounts.housingCount,
        filteredOwnerCount: filteredCounts.ownerCount,
        totalCount: totalCounts.housingCount,
        page: isPaginationEnable(pagination) ? pagination.page : undefined,
        perPage: isPaginationEnable(pagination)
          ? pagination.perPage
          : undefined,
      }
  );
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

const countWithFilters = async (
  filters: HousingFiltersApi
): Promise<{ housingCount: number; ownerCount: number }> => {
  try {
    return db(housingTable)
      .countDistinct(`${housingTable}.id as housing_count`)
      .countDistinct(`o.id as owner_count`)
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
                      filters.establishmentIds?.length
                        ? ` and c.establishment_id in (?)`
                        : ''
                    }
                ) campaigns on true`,
        filters.establishmentIds ?? []
      )
      .modify(filteredQuery(filters))
      .then((_) => ({
        housingCount: Number(_[0].housing_count),
        ownerCount: Number(_[0].owner_count),
      }));
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

const update = async (housingApi: HousingApi): Promise<void> => {
  console.log('Update housingApi', housingApi.id);

  return db(housingTable)
    .where('id', housingApi.id)
    .update({
      occupancy: housingApi.occupancy,
      occupancy_intended: housingApi.occupancyIntended ?? null,
      status: housingApi.status,
      sub_status: housingApi.subStatus ?? null,
      precisions: housingApi.precisions ?? null,
      vacancy_reasons: housingApi.vacancyReasons ?? null,
    });
};

interface HousingRecordDBO {
  id: string;
  invariant: string;
  local_id: string;
  raw_address: string[];
  geo_code: string;
  longitude?: number;
  latitude?: number;
  cadastral_classification: number;
  uncomfortable: boolean;
  vacancy_start_year: number;
  housing_kind: string;
  rooms_count: number;
  living_area: number;
  cadastral_reference: string;
  building_year?: number;
  taxed: boolean;
  vacancy_reasons: string[];
  data_years: number[];
  building_location?: string;
  ownership_kind?: OwnershipKindsApi;
  status: HousingStatusApi;
  sub_status?: string;
  precisions?: string[];
  energy_consumption?: EnergyConsumptionGradesApi;
  energy_consumption_worst?: EnergyConsumptionGradesApi;
  occupancy: OccupancyKindApi;
  occupancy_intended?: OccupancyKindApi;
  latitude_ban?: number;
  longitude_ban?: number;
}

interface HousingDBO extends HousingRecordDBO {
  owner_id: string;
  owner_birth_date?: Date;
  coowners: OwnerDBO[];
  // TODO: fix this
  [key: string]: any;
}

export const parseHousingApi = (result: HousingDBO): HousingApi => ({
  id: result.id,
  invariant: result.invariant,
  localId: result.local_id,
  rawAddress: result.raw_address,
  geoCode: result.geo_code,
  longitude: result.longitude_ban ?? result.longitude,
  latitude: result.latitude_ban ?? result.latitude,
  cadastralClassification: result.cadastral_classification,
  uncomfortable: result.uncomfortable,
  vacancyStartYear: result.vacancy_start_year,
  housingKind: result.housing_kind,
  roomsCount: result.rooms_count,
  livingArea: result.living_area,
  cadastralReference: result.cadastral_reference,
  buildingYear: result.building_year,
  taxed: result.taxed,
  vacancyReasons: result.vacancy_reasons,
  dataYears: result.data_years,
  buildingLocation: result.building_location,
  ownershipKind: getOwnershipKindFromValue(result.ownership_kind),
  status: result.status,
  subStatus: result.sub_status,
  precisions: result.precisions,
  energyConsumption: result.energy_consumption,
  energyConsumptionWorst: result.energy_consumption_worst,
  occupancy: result.occupancy,
  occupancyIntended: result.occupancy_intended,
  localityKind: result.locality_kind,
  geoPerimeters: result.geo_perimeters,
  owner: {
    id: result.owner_id,
    birthDate: result.owner_birth_date,
    rawAddress: result.owner_raw_address.filter((_: string) => _ && _.length),
    fullName: result.full_name,
    administrator: result.administrator,
    email: result.email,
    phone: result.phone,
  },
  coowners: [],
  buildingHousingCount: result.housing_count,
  buildingVacancyRate: result.vacant_housing_count
    ? Math.round(
        (result.vacant_housing_count * 100) /
          (result.housing_count ?? result.vacant_housing_count)
      )
    : undefined,
  campaignIds: (result.campaign_ids ?? []).filter((_: any) => _),
  contactCount: result.contact_count,
  lastContact: result.last_contact,
});

const formatHousingRecordApi = (
  housingRecordApi: HousingRecordApi
): HousingRecordDBO => ({
  id: housingRecordApi.id,
  invariant: housingRecordApi.invariant,
  local_id: housingRecordApi.localId,
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
  energy_consumption_worst: housingRecordApi.energyConsumptionWorst,
  occupancy: housingRecordApi.occupancy,
  occupancy_intended: housingRecordApi.occupancyIntended,
});

export default {
  get,
  listWithFilters,
  stream,
  paginatedListWithFilters,
  countVacant,
  countWithFilters,
  listByIds,
  update,
  countByStatusWithFilters,
  formatHousingRecordApi,
  saveMany,
};
