import db from './db';
import { HousingApi } from '../models/HousingApi';
import { AddressApi } from '../models/AddressApi';
import { ownerTable } from './ownerRepository';
import { OwnerApi } from '../models/OwnerApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { HousingFiltersApi } from '../models/HousingFiltersApi';
import { housingScopeGeometryTable } from './establishmentRepository';
import { localitiesTable } from './localityRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';

export const housingTable = 'housing';
export const buildingTable = 'buildings';
export const ownersHousingTable = 'owners_housing';


const listWithFilters = async (establishmentId: string, filters: HousingFiltersApi, page?: number, perPage?: number): Promise<PaginatedResultApi<HousingApi>> => {

    try {
        const filter = (queryBuilder: any) => {
            if (filters.campaignIds?.length) {
                queryBuilder.whereIn('campaigns.campaign_id', filters.campaignIds)
            }
            if (filters.campaignsCounts?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.campaignsCounts?.indexOf('0') !== -1) {
                        whereBuilder.orWhereNull('campaigns.campaign_count')
                    }
                    if (filters.campaignsCounts?.indexOf('current') !== -1) {
                        whereBuilder.orWhereRaw('campaigns.campaign_count >= 1')
                    }
                    if (filters.campaignsCounts?.indexOf('1') !== -1) {
                        whereBuilder.orWhere('campaigns.campaign_count', 1)
                    }
                    if (filters.campaignsCounts?.indexOf('2') !== -1) {
                        whereBuilder.orWhere('campaigns.campaign_count', 2)
                    }
                    if (filters.campaignsCounts?.indexOf('gt3') !== -1) {
                        whereBuilder.orWhereRaw('campaigns.campaign_count >= ?', 3)
                    }
                })
            }
            if (filters.ownerIds?.length) {
                queryBuilder.whereIn('o.id', filters.ownerIds)
            }
            if (filters.ownerKinds?.length) {
                queryBuilder.whereIn('owner_kind', filters.ownerKinds)
            }
            if (filters.ownerAges?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.ownerAges?.indexOf('lt40') !== -1) {
                        whereBuilder.orWhereRaw("date_part('year', current_date) - date_part('year', birth_date) <= 40")
                    }
                    if (filters.ownerAges?.indexOf('40to60') !== -1) {
                        whereBuilder.orWhereRaw("date_part('year', current_date) - date_part('year', birth_date) between 40 and 60")
                    }
                    if (filters.ownerAges?.indexOf('60to75') !== -1) {
                        whereBuilder.orWhereRaw("date_part('year', current_date) - date_part('year', birth_date) between 60 and 75")
                    }
                    if (filters.ownerAges?.indexOf('gt75') !== -1) {
                        whereBuilder.orWhereRaw("date_part('year', current_date) - date_part('year', birth_date) >= 75")
                    }
                })
            }
            if (filters.multiOwners?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.multiOwners?.indexOf('true') !== -1) {
                        whereBuilder.orWhereRaw('array_length(local_ids, 1) > 1')
                    }
                    if (filters.multiOwners?.indexOf('false') !== -1) {
                        whereBuilder.orWhereRaw('array_length(local_ids, 1) = 1')
                    }
                })
            }
            if (filters.beneficiaryCounts?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    whereBuilder.whereIn(`${housingTable}.beneficiary_count`, filters.beneficiaryCounts?.filter((_: string) => !isNaN(+_)))
                    if (filters.beneficiaryCounts?.indexOf('0') !== -1) {
                        whereBuilder.orWhereNull(`${housingTable}.beneficiary_count`)
                    }
                    if (filters.beneficiaryCounts?.indexOf('gt5') !== -1) {
                        whereBuilder.orWhereRaw(`${housingTable}.beneficiary_count >= 5`)
                    }
                })
            }
            if (filters.housingKinds?.length) {
                queryBuilder.whereIn('housing_kind', filters.housingKinds)
            }
            if (filters.housingAreas?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.housingAreas?.indexOf('lt35') !== -1) {
                        whereBuilder.orWhereBetween('living_area', [0, 35])
                    }
                    if (filters.housingAreas?.indexOf('35to75') !== -1) {
                        whereBuilder.orWhereBetween('living_area', [35, 75])
                    }
                    if (filters.housingAreas?.indexOf('75to100') !== -1) {
                        whereBuilder.orWhereBetween('living_area', [75, 100])
                    }
                    if (filters.housingAreas?.indexOf('gt100') !== -1) {
                        whereBuilder.orWhereRaw('living_area >= 100')
                    }
                })
            }
            if (filters.roomsCounts?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.roomsCounts?.indexOf('gt5') !== -1) {
                        whereBuilder.orWhereRaw('rooms_count >= 5')
                    }
                    whereBuilder.orWhereIn('rooms_count', filters.roomsCounts);
                })
            }
            if (filters.housingStates?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.housingStates?.indexOf('Inconfortable') !== -1) {
                        whereBuilder.orWhere('uncomfortable', true)
                    }
                    if (filters.housingStates?.indexOf('Confortable') !== -1) {
                        whereBuilder.orWhere(function(whereBuilder2: any) {
                            whereBuilder2.andWhereBetween('cadastral_classification', [4, 6])
                            whereBuilder2.andWhereNot('uncomfortable', true)
                        })
                    }
                    if (filters.housingStates?.indexOf('VeryConfortable') !== -1) {
                        whereBuilder.orWhereBetween('cadastral_classification', [1, 3])
                    }
                })
            }
            if (filters.buildingPeriods?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.buildingPeriods?.indexOf('lt1919') !== -1) {
                        whereBuilder.orWhereBetween('building_year', [0, 1918])
                    }
                    if (filters.buildingPeriods?.indexOf('1919to1945') !== -1) {
                        whereBuilder.orWhereBetween('building_year', [1919, 1945])
                    }
                    if (filters.buildingPeriods?.indexOf('1946to1990') !== -1) {
                        whereBuilder.orWhereBetween('building_year', [1946, 1990])
                    }
                    if (filters.buildingPeriods?.indexOf('gt1991') !== -1) {
                        whereBuilder.orWhereRaw('building_year >= 1991')
                    }
                })
            }
            if (filters.vacancyDurations?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    const dataYear = 2020
                    if (filters.vacancyDurations?.indexOf('lt2') !== -1) {
                        whereBuilder.orWhereBetween('vacancy_start_year', [dataYear - 1, dataYear])
                    }
                    if (filters.vacancyDurations?.indexOf('2to5') !== -1) {
                        whereBuilder.orWhereBetween('vacancy_start_year', [dataYear - 4, dataYear - 2])
                    }
                    if (filters.vacancyDurations?.indexOf('5to10') !== -1) {
                        whereBuilder.orWhereBetween('vacancy_start_year', [dataYear -9, dataYear - 5])
                    }
                    if (filters.vacancyDurations?.indexOf('gt10') !== -1) {
                        whereBuilder.orWhereBetween('vacancy_start_year', [0, dataYear - 10])
                    }
                })
            }
            if (filters.isTaxedValues?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.isTaxedValues?.indexOf('true') !== -1) {
                        whereBuilder.orWhereRaw('taxed')
                    }
                    if (filters.isTaxedValues?.indexOf('false') !== -1) {
                        whereBuilder.orWhereRaw('not(taxed)')
                    }
                })
            }
            if (filters.ownershipKinds?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.ownershipKinds?.indexOf('single') !== -1) {
                        whereBuilder.orWhere('ownership_kind', '0')
                    }
                    if (filters.ownershipKinds?.indexOf('co') !== -1) {
                        whereBuilder.orWhere('ownership_kind', 'CL')
                    }
                    if (filters.ownershipKinds?.indexOf('other') !== -1) {
                        whereBuilder.orWhereIn('ownership_kind', ['BND', 'CLV', 'CV', 'MP', 'TF'])
                    }
                })
            }
            if (filters.housingCounts?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.housingCounts?.indexOf('lt5') !== -1) {
                        whereBuilder.orWhereRaw('coalesce(housing_count, 0) between 0 and 4')
                    }
                    if (filters.housingCounts?.indexOf('5to20') !== -1) {
                        whereBuilder.orWhereBetween('housing_count', [5, 20])
                    }
                    if (filters.housingCounts?.indexOf('20to50') !== -1) {
                        whereBuilder.orWhereBetween('housing_count', [20, 50])
                    }
                    if (filters.housingCounts?.indexOf('gt50') !== -1) {
                        whereBuilder.orWhereRaw('housing_count > 50')
                    }
                })
            }
            if (filters.vacancyRates?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.vacancyRates?.indexOf('lt20') !== -1) {
                        whereBuilder.orWhereRaw('vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) < 20')
                    }
                    if (filters.vacancyRates?.indexOf('20to40') !== -1) {
                        whereBuilder.orWhereRaw('vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) between 20 and 40')
                    }
                    if (filters.vacancyRates?.indexOf('40to60') !== -1) {
                        whereBuilder.orWhereRaw('vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) between 40 and 60')
                    }
                    if (filters.vacancyRates?.indexOf('60to80') !== -1) {
                        whereBuilder.orWhereRaw('vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) between 60 and 80')
                    }
                    if (filters.vacancyRates?.indexOf('gt80') !== -1) {
                        whereBuilder.orWhereRaw('vacant_housing_count * 100 / coalesce(housing_count, vacant_housing_count) > 80')
                    }
                })
            }
            if (filters.localities?.length) {
                queryBuilder.whereIn('insee_code', filters.localities)
            }
            if (filters.localityKinds?.length) {
                queryBuilder.whereIn(`${localitiesTable}.locality_kind`, filters.localityKinds)
            }
            if (filters.housingScopes && filters.housingScopes.scopes.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.housingScopes?.geom) {
                        if (filters.housingScopes.scopes.indexOf('None') !== -1) {
                            whereBuilder.orWhereNull('hsg.type')
                        }
                        whereBuilder.orWhereRaw(`array[${filters.housingScopes.scopes.map(_ => `'${_}'`).join(',')}] @> array[hsg.type]::text[]`)
                    } else {
                        if (filters.housingScopes?.scopes.indexOf('None') !== -1) {
                            whereBuilder.orWhereNull('housing_scope')
                        }
                        whereBuilder.orWhereIn('housing_scope', filters.housingScopes?.scopes)
                    }
                })
            }
            if (filters.dataYears?.length) {
                queryBuilder.whereRaw('data_years && ?::integer[]', [filters.dataYears])
            }
            if (filters.status?.filter(_ => _ !== HousingStatusApi.NotInCampaign).length) {
                queryBuilder.whereIn(`${housingTable}.status`, filters.status.filter(_ => _ !== HousingStatusApi.NotInCampaign))
            }
            if (filters.query?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    whereBuilder.orWhereRaw('upper(full_name) like ?', `%${filters.query?.toUpperCase()}%`)
                    whereBuilder.orWhereRaw('upper(administrator) like ?', `%${filters.query?.toUpperCase()}%`)
                    whereBuilder.orWhereRaw(`upper(array_to_string(${housingTable}.raw_address, '%')) like ?`, `%${filters.query?.toUpperCase()}%`)
                    whereBuilder.orWhereRaw(`upper(array_to_string(o.raw_address, '%')) like ?`, `%${filters.query?.toUpperCase()}%`)
                })
            }
        }

        const query = db
            .select(
                `${housingTable}.*`,
                'o.id as owner_id',
                'o.raw_address as owner_raw_address',
                'o.full_name',
                'o.administrator',
                'o.house_number as owner_house_number',
                'o.street as owner_street',
                'o.postal_code as owner_postal_code',
                'o.city as owner_city',
                db.raw('json_agg(distinct(campaigns.campaign_id)) as campaign_ids'),
                db.raw('array_agg(distinct(hsg.type))')
            )
            .from(housingTable)
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .join(localitiesTable, `${housingTable}.insee_code`, `${localitiesTable}.geo_code`)
            .leftJoin(buildingTable, `${housingTable}.building_id`, `${buildingTable}.id`)
            .joinRaw(`left join lateral (
                select campaign_id as campaign_id, count(*) over() as campaign_count 
                from campaigns_housing ch, campaigns c 
                where housing.id = ch.housing_id 
                and c.id = ch.campaign_id
                and c.establishment_id = '${establishmentId}'
            ) campaigns on true`)
            .joinRaw(`left join ${housingScopeGeometryTable} as hsg on st_contains(hsg.geom, ST_SetSRID( ST_Point(${housingTable}.latitude, ${housingTable}.longitude), 4326))`)
            .groupBy(`${housingTable}.id`, 'o.id')
            .modify(filter)

        const results = await query
            .modify((queryBuilder: any) => {
                if (page && perPage) {
                    queryBuilder
                        .offset((page - 1) * perPage)
                        .limit(perPage)
                }
            })

        const housingCount: number = await db(housingTable)
            .countDistinct(`${housingTable}.id`)
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .join(localitiesTable, `${housingTable}.insee_code`, `${localitiesTable}.geo_code`)
            .leftJoin(buildingTable, `${housingTable}.building_id`, `${buildingTable}.id`)
            .joinRaw(`left join lateral (
                select campaign_id as campaign_id, count(*) over() as campaign_count 
                from campaigns_housing ch, campaigns c 
                where housing.id = ch.housing_id 
                and c.id = ch.campaign_id
                and c.establishment_id = '${establishmentId}'
            ) campaigns on true`)            .joinRaw(`left join ${housingScopeGeometryTable} as hsg on st_contains(hsg.geom, ST_SetSRID( ST_Point(${housingTable}.latitude, ${housingTable}.longitude), 4326))`)
            .modify(filter)
            .then(_ => Number(_[0].count))

        return <PaginatedResultApi<HousingApi>> {
            entities: results.map((result: any) => parseHousingApi(result)),
            totalCount: housingCount,
            page,
            perPage
        }
    } catch (err) {
        console.error('Listing housing failed', err);
        throw new Error('Listing housing failed');
    }
}

const listByIds = async (ids: string[]): Promise<HousingApi[]> => {
    try {
        return db
            .select(
                `${housingTable}.*`,
                'o.id as owner_id',
                'o.raw_address as owner_raw_address',
                'o.full_name',
                'o.administrator',
                'o.house_number as owner_house_number',
                'o.street as owner_street',
                'o.postal_code as owner_postal_code',
                'o.city as owner_city'
            )
            .from(housingTable)
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .whereIn(`${housingTable}.id`, ids)
            .then(_ => _.map(_ => parseHousingApi(_)))
    } catch (err) {
        console.error('Listing housing failed', err);
        throw new Error('Listing housing failed');
    }
}

const updateHousingList = async (housingIds: string[], status: HousingStatusApi, subStatus? : string, precision?: string, vacancyReasons?: string[]): Promise<HousingApi[]> => {

    console.log('update housing list', housingIds.length)

    try {
        return db(housingTable)
            .whereIn('id', housingIds)
            .update({
                status: status,
                sub_status: subStatus ?? null,
                precision: precision ?? null,
                vacancy_reasons: vacancyReasons ?? null,
            })
            .returning('*');
    } catch (err) {
        console.error('Updating campaign housing list failed', err, housingIds.length);
        throw new Error('Updating campaign housing list failed');
    }
}

const updateAddressList = async (housingAdresses: {addressId: string, addressApi: AddressApi}[]): Promise<HousingApi[]> => {
    try {
        const update = 'UPDATE housing as h SET ' +
            'postal_code = c.postal_code, house_number = c.house_number, street = c.street, city = c.city ' +
            'FROM (values' +
            housingAdresses
                .filter(ha => ha.addressId)
                .map(ha => `('${ha.addressId}', '${ha.addressApi.postalCode}', '${ha.addressApi.houseNumber ?? ''}', '${escapeValue(ha.addressApi.street)}', '${escapeValue(ha.addressApi.city)}')`)
            +
            ') as c(id, postal_code, house_number, street, city)' +
            ' WHERE h.id::text = c.id'

        return db.raw(update);
    } catch (err) {
        console.error('Listing housing failed', err);
        throw new Error('Listing housing failed');
    }
}

const escapeValue = (value?: string) => {
    return value ? value.replace(/'/g, '\'\'') : ''
}

const parseHousingApi = (result: any) => (
    <HousingApi>{
        id: result.id,
        invariant: result.invariant,
        cadastralReference: result.cadastral_reference,
        buildingLocation: result.building_location,
        inseeCode: result.insee_code,
        rawAddress: result.raw_address,
        address: <AddressApi>{
            houseNumber: result.house_number,
            street: result.street,
            postalCode: result.postal_code,
            city: result.city
        },
        latitude: result.latitude,
        longitude: result.longitude,
        owner: <OwnerApi>{
            id: result.owner_id,
            rawAddress: result.owner_raw_address,
            fullName: result.full_name,
            administrator: result.administrator,
            address: <AddressApi>{
                houseNumber: result.owner_house_number,
                street: result.owner_street,
                postalCode: result.owner_postal_code,
                city: result.owner_city
            }
        },
        livingArea: result.living_area,
        housingKind: result.housing_kind,
        roomsCount: result.rooms_count,
        buildingYear: result.building_year,
        vacancyStartYear: result.vacancy_start_year,
        vacancyReasons: result.vacancy_reasons,
        dataYears: result.data_years,
        campaignIds: (result.campaign_ids ?? []).filter((_: any) => _),
        status: result.status,
        subStatus: result.sub_status,
        precision: result.precision
    }
)

export default {
    listWithFilters,
    listByIds,
    updateHousingList,
    updateAddressList
}
