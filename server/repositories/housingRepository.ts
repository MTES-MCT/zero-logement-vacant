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
import { HousingOwnerApi } from '../models/OwnerApi';
import { Knex } from 'knex';
import _ from 'lodash';
import validator from 'validator';
import { PaginationOptions } from '../../shared/models/Pagination';
import { logger } from '../utils/logger';
import { HousingCountApi } from '../models/HousingCountApi';
import { PaginationApi, paginationQuery } from '../models/PaginationApi';
import { sortQuery } from '../models/SortApi';
import isNumeric = validator.isNumeric;

export const housingTable = 'fast_housing';
export const buildingTable = 'buildings';
export const ownersHousingTable = 'owners_housing';
export const establishmentsLocalitiesTable = 'establishments_localities';

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
    }));
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
    await transaction(ownersHousingTable).whereIn('housing_id', ids).delete();
    await transaction(ownersHousingTable).insert(ownersHousing);
  });
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
    geoCodes: establishment.geoCodes,
    filters: {
      establishmentIds: [establishmentId],
    },
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

export const filteredQuery = (filters: HousingFiltersApi) => {
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
      queryBuilder.whereIn('h.geo_code', filters.localities);
    }
    if (filters.localityKinds?.length) {
      queryBuilder
        .join(localitiesTable, 'h.geo_code', `${localitiesTable}.geo_code`)
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
    if (filters.status?.length) {
      queryBuilder.whereIn('status', filters.status);
    }
    if (filters.subStatus?.length) {
      queryBuilder.whereIn('sub_status', filters.subStatus);
    }
    queryOwnerHousingWhereClause(queryBuilder, filters.query);
  };
};

interface ListQueryOptions {
  filters: HousingFiltersApi;
  geoCodes: string[];
}

const fastListQuery = (opts: ListQueryOptions) => {
  return (
    db
      .select(`${housingTable}.*`)
      .from(housingTable)
      .whereIn(`${housingTable}.geo_code`, opts.geoCodes)
      // Owners
      .select(
        'o.id as owner_id',
        'o.raw_address as owner_raw_address',
        'o.full_name',
        'o.administrator',
        'o.email',
        'o.phone'
      )
      .join(ownersHousingTable, (join) => {
        join
          .on(`${housingTable}.id`, `${ownersHousingTable}.housing_id`)
          .onVal('rank', 1);
      })
      .join({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
      // Campaigns
      .select('campaigns.*')
      .joinRaw(
        `LEFT JOIN LATERAL (
           SELECT array_agg(distinct(campaign_id)) AS campaign_ids, ARRAY_LENGTH(array_agg(distinct(campaign_id)), 1) AS campaign_count
           FROM campaigns_housing ch, campaigns c 
           WHERE ${housingTable}.id = ch.housing_id 
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

interface FindOptions extends PaginationOptions {
  filters: HousingFiltersApi;
  sort?: HousingSortApi;
}

const find = async (opts: FindOptions): Promise<HousingApi[]> => {
  logger.debug('housingRepository.find', opts);

  // Retrieve geo codes as literals to help the query planner,
  // otherwise it would go throughout a lot of irrelevant partitions
  const geoCodes = await db(establishmentsTable)
    .select(db.raw('unnest(localities_geo_code) AS geo_code'))
    .whereIn('id', opts.filters.establishmentIds ?? [])
    .then((geoCodes) => geoCodes.map((_) => _.geo_code));

  const housingList: HousingDBO[] = await fastListQuery({
    filters: opts.filters,
    geoCodes,
  })
    .modify(
      sortQuery(opts.sort, {
        keys: {
          owner: (query) => query.orderBy('o.full_name', opts.sort?.owner),
          rawAddress: (query) => {
            query
              .orderBy('${housingTable}.raw_address[2]', opts.sort?.rawAddress)
              .orderByRaw(
                `array_to_string(((string_to_array(${housingTable}."raw_address"[1], ' '))[2:]), '') ${opts.sort?.rawAddress}`
              )
              .orderByRaw(
                `(string_to_array(${housingTable}."raw_address"[1], ' '))[1] ${opts.sort?.rawAddress}`
              );
          },
        },
        default: (query) => query.orderBy(['geo_code', 'id']),
      })
    )
    .modify(paginationQuery(opts.pagination as PaginationApi));

  logger.trace('housingRepository.find', { housing: housingList.length });
  return housingList.map(parseHousingApi);
};

const listWithFilters = async (
  filters: HousingFiltersApi
): Promise<HousingApi[]> => {
  const establishments = await establishmentRepository.find({
    ids: filters.establishmentIds,
  });
  const geoCodes = establishments.flatMap(
    (establishment) => establishment?.geoCodes
  );

  return fastListQuery({
    filters,
    geoCodes,
  })
    .modify(queryHousingEventsJoinClause)
    .then((_) => _.map((result: any) => parseHousingApi(result)));
};

const streamWithFilters = (
  filters: HousingFiltersApi
): Highland.Stream<HousingApi> => {
  const fetchGeoCodes = async (): Promise<string[]> =>
    db(establishmentsTable)
      .select(db.raw('unnest(localities_geo_code) AS geo_code'))
      .whereIn('id', filters.establishmentIds ?? [])
      .then((geoCodes) => geoCodes.map((_) => _.geo_code));

  return highland(fetchGeoCodes())
    .flatten()
    .collect()
    .flatMap((geoCodes) => {
      return highland<HousingDBO>(
        fastListQuery({ filters, geoCodes })
          .modify(queryHousingEventsJoinClause)
          .stream()
      );
    })
    .map(parseHousingApi);
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

  const geoCodes = await db(establishmentsTable)
    .select(db.raw('unnest(localities_geo_code) AS geo_code'))
    .whereIn('id', filters.establishmentIds ?? [])
    .then((geoCodes) => geoCodes.map((_) => _.geo_code));

  const result = await db
    .with('list', fastListQuery({ filters, geoCodes }))
    .countDistinct('id as housing')
    .countDistinct('owner_id as owners')
    .from('list')
    .first();

  return {
    housing: Number(result?.housing),
    owners: Number(result?.owners),
  };
};

const update = async (housingApi: HousingApi): Promise<void> => {
  console.log('Update housingApi', housingApi.id);

  return db(housingTable)
    .where({
      // Use the index on the partitioned table
      geo_code: housingApi.geoCode,
      id: housingApi.id,
    })
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
  occupancy: OccupancyKindApi;
  occupancy_registered?: OccupancyKindApi;
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
  vacancyReasons: result.vacancy_reasons ?? undefined,
  dataYears: result.data_years,
  buildingLocation: result.building_location,
  ownershipKind: getOwnershipKindFromValue(result.ownership_kind),
  status: result.status,
  subStatus: result.sub_status ?? undefined,
  precisions: result.precisions ?? undefined,
  energyConsumption: result.energy_consumption,
  occupancy: result.occupancy,
  occupancyRegistered: result.occupancy_registered,
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
  contactCount: Number(result.contact_count),
  lastContact: result.last_contact,
});

export const formatHousingRecordApi = (
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
  occupancy: housingRecordApi.occupancy,
  occupancy_registered: housingRecordApi.occupancyRegistered,
  occupancy_intended: housingRecordApi.occupancyIntended,
});

export default {
  get,
  find,
  listWithFilters,
  streamWithFilters,
  stream,
  count,
  countVacant,
  update,
  formatHousingRecordApi,
  saveMany,
};
