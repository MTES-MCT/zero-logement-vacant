import db from './db';
import { HousingApi } from '../models/HousingApi';
import { AddressApi } from '../models/AddressApi';
import { ownerTable } from './ownerRepository';
import { OwnerApi } from '../models/OwnerApi';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { HousingFiltersApi } from '../models/HousingFiltersApi';

export const housingTable = 'housing';


const list = async (filters: HousingFiltersApi, offset: number, limit: number): Promise<PaginatedResultApi<HousingApi>> => {

    try {

        console.log('filters.housingKinds', filters.housingKinds)

        const filter = (queryBuilder: any) => {
            if (filters.ownerKinds?.length) {
                queryBuilder.whereIn('owner_kind', filters.ownerKinds)
            }
            //TODO Age
            if (filters.multiOwners?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    if (filters.multiOwners?.indexOf('true') !== -1) {
                        whereBuilder.orWhereRaw('array_length(invariants, 1) > 1')
                    }
                    if (filters.multiOwners?.indexOf('false') !== -1) {
                        whereBuilder.orWhereRaw('array_length(invariants, 1) = 1')
                    }
                })
            }
            if (filters.beneficiaryCounts?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    whereBuilder.whereIn('beneficiary_count', filters.beneficiaryCounts?.filter((_: string) => !isNaN(+_)))
                    if (filters.beneficiaryCounts?.indexOf('0') !== -1) {
                        whereBuilder.orWhereNull('beneficiary_count')
                    }
                    if (filters.beneficiaryCounts?.indexOf('gt5') !== -1) {
                        whereBuilder.orWhereRaw('beneficiary_count >= 5')
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
            if (filters.housingStates?.indexOf('Inconfortable') !== -1) {
                queryBuilder.where('uncomfortable', true)
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
                    const thisYear = (new Date()).getFullYear()
                    if (filters.vacancyDurations?.indexOf('lt2') !== -1) {
                        whereBuilder.orWhereBetween('vacancy_start_year', [thisYear - 2, thisYear])
                    }
                    if (filters.vacancyDurations?.indexOf('2to5') !== -1) {
                        whereBuilder.orWhereBetween('vacancy_start_year', [thisYear - 5, thisYear - 3])
                    }
                    if (filters.vacancyDurations?.indexOf('gt5') !== -1) {
                        whereBuilder.orWhereBetween('vacancy_start_year', [0, thisYear - 6])
                    }
                    if (filters.vacancyDurations?.indexOf('gt10') !== -1) {
                        whereBuilder.orWhereBetween('vacancy_start_year', [0, thisYear - 11])
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
            if (filters.query?.length) {
                queryBuilder.where(function(whereBuilder: any) {
                    whereBuilder.orWhere('full_name', 'like', `%${filters.query?.toUpperCase()}%`)
                    whereBuilder.orWhere('administrator', 'like', `%${filters.query?.toUpperCase()}%`)
                    whereBuilder.orWhereRaw(`array_to_string(${housingTable}.raw_address, '%') like '%${filters.query?.toUpperCase()}%'`)
                    whereBuilder.orWhereRaw(`array_to_string(o.raw_address, '%') like '%${filters.query?.toUpperCase()}%'`)
                })
            }
        }

        var query = db
            .select(`${housingTable}.*`, 'o.id as owner_id', 'o.raw_address as owner_raw_address', 'o.full_name')
            .from(`${housingTable}`)
            .joinRaw(`join ${ownerTable} as o on (invariant = any(o.invariants))`)
            .modify(filter)

        const results = await query
            .offset(offset)
            .limit(limit)

        const housingCount: number = await db(housingTable)
            .count()
            .joinRaw(`join ${ownerTable} as o on (invariant = any(o.invariants))`)
            .modify(filter)
            .then(_ => Number(_[0].count))

        return <PaginatedResultApi<HousingApi>> {
            totalCount: housingCount,
            entities: results.map((r: any) => (<HousingApi>{
                id: r.id,
                rawAddress: r.raw_address,
                address: <AddressApi>{
                    houseNumber: r.house_number,
                    street: r.street,
                    postalCode: r.postal_code,
                    city: r.city
                },
                owner: <OwnerApi>{
                    id: r.owner_id,
                    rawAddress: r.owner_raw_address,
                    fullName: r.full_name
                }
            }))
        }
    } catch (err) {
        console.error('Listing housing failed', err);
        throw new Error('Listing housing failed');
    }
}

const rawUpdate = async (update: string): Promise<HousingApi[]> => {
    try {
        return db.raw(update)
    } catch (err) {
        console.error('Listing housing failed', err);
        throw new Error('Listing housing failed');
    }
}

export default {
    list,
    rawUpdate
}
