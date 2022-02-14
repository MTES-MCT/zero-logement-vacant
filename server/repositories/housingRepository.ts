import db from './db';
import { HousingApi } from '../models/HousingApi';
import { AddressApi } from '../models/AddressApi';
import { ownerTable } from './ownerRepository';
import { OwnerApi } from '../models/OwnerApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { HousingFiltersApi } from '../models/HousingFiltersApi';
import { campaignsHousingTable } from './campaignHousingRepository';
import { housingScopeGeometryTable } from './establishmentRepository';

export const housingTable = 'housing';
export const ownersHousingTable = 'owners_housing';


const listWithFilters = async (filters: HousingFiltersApi, page?: number, perPage?: number): Promise<PaginatedResultApi<HousingApi>> => {

    try {
        const filter = (queryBuilder: any) => {
            if (filters.campaignIds?.length) {
                queryBuilder.whereExists((whereBuilder: any) => {
                    whereBuilder.from(campaignsHousingTable)
                        .whereIn('campaign_id', filters.campaignIds)
                        .whereRaw(`housing_id = ${housingTable}.id`)
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
            if (filters.housingStates?.length) {
                if (filters.housingStates?.indexOf('Inconfortable') !== -1) {
                    queryBuilder.where('uncomfortable', true)
                }
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
            if (filters.localities?.length) {
                queryBuilder.whereIn('insee_code', filters.localities)
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
                db.raw('json_agg(campaigns) campaign_ids'),
                db.raw('array_agg(distinct(hsg.type))')
            )
            .from(housingTable)
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .joinRaw(`left join lateral (select campaign_id from campaigns_housing ch where ${housingTable}.id = ch.housing_id) campaigns on true`)
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
            .joinRaw(`left join ${housingScopeGeometryTable} as hsg on st_contains(hsg.geom, ST_SetSRID( ST_Point(${housingTable}.latitude, ${housingTable}.longitude), 4326))`)
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
        dataYears: result.data_years,
        campaignIds: (result.campaign_ids ?? []).map((_: any) => _?.campaign_id).filter((_: any) => _)
    }
)

export default {
    listWithFilters,
    listByIds,
    updateAddressList
}
