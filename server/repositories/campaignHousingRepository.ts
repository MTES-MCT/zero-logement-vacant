import db from './db';
import { housingTable, ownersHousingTable } from './housingRepository';
import { ownerTable } from './ownerRepository';
import { PaginatedResultApi } from '../models/PaginatedResultApi';
import { CampaignHousingApi, CampaignHousingUpdateApi } from '../models/HousingApi';
import { AddressApi } from '../models/AddressApi';
import { OwnerApi } from '../models/OwnerApi';

export const campaignsHousingTable = 'campaigns_housing';

const insertHousingList = async (campaignId: string, housingIds: string[]): Promise<string[]> => {
    try {
        return db(campaignsHousingTable)
            .insert(housingIds.map(housingId => ({
                campaign_id: campaignId,
                housing_id: housingId
            })))
            .returning('housing_id')
    } catch (err) {
        console.error('Inserting housing list failed', err, campaignId);
        throw new Error('Inserting housing list failed');
    }
}

const getHousingOwnerIds = async (campaignId: string): Promise<{housingId: string, ownerId: string}[]> => {
    try {
        return db
            .select(`${campaignsHousingTable}.housing_id`, 'o.id as owner_id')
            .from(`${campaignsHousingTable}`)
            .where('campaign_id', campaignId)
            .join(housingTable, `${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .then(_ => _.map(_ => ({
                housingId: _.housing_id,
                ownerId: _.owner_id,
            })))
    } catch (err) {
        console.error('Getting housing and owner ids failed', err, campaignId);
        throw new Error('Getting housing and owner ids failed');
    }
}

const removeHousingFromCampaign = async (campaignId: string, housingIds: string[]): Promise<number> => {
    try {
        return db
            .delete()
            .from(`${campaignsHousingTable}`)
            .where('campaign_id', campaignId)
            .whereIn('housing_id', housingIds)
    } catch (err) {
        console.error('Removing housing from campaign failed', err, campaignId, housingIds);
        throw new Error('Removing housing from campaign failed');
    }
}

const listCampaignHousing = async (campaignId: string, status: number, page?: number, perPage?: number, excludedIds?: string[]): Promise<PaginatedResultApi<CampaignHousingApi>> => {
    try {
        const filter = (queryBuilder: any) => {
            if (excludedIds?.length) {
                queryBuilder.whereNotIn(`${housingTable}.id`, excludedIds)
            }

            if (status !== undefined) {
                queryBuilder.where('ch.status', status)
            }
        }

        const query = db
            .select(`${housingTable}.*`, 'o.id as owner_id', 'o.raw_address as owner_raw_address', 'o.full_name', `ch.*`)
            .from(housingTable)
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, 'o.id')
            .join({ch: campaignsHousingTable}, `${housingTable}.id`, 'ch.housing_id')
            .where (`ch.campaign_id`, campaignId)

        const results = await query
            .modify(filter)
            .modify((queryBuilder: any) => {
                if (page && perPage) {
                    queryBuilder
                        .offset((page - 1) * perPage)
                        .limit(perPage)
                }
            })

        const campaignHousingCount: number = await db(housingTable)
            .count()
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, 'o.id')
            .join({ch: campaignsHousingTable}, `${housingTable}.id`, 'ch.housing_id')
            .where (`ch.campaign_id`, campaignId)
            .modify(filter)
            .then(_ => Number(_[0].count))

        return <PaginatedResultApi<CampaignHousingApi>> {
            entities: results.map((result: any) => (<CampaignHousingApi>{
                id: result.id,
                invariant: result.invariant,
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
                    fullName: result.full_name
                },
                livingArea: result.living_area,
                housingKind: result.housing_kind,
                roomsCount: result.rooms_count,
                buildingYear: result.building_year,
                vacancyStartYear: result.vacancy_start_year,
                campaignId,
                status: result.status,
                step: result.step,
                precision: result.precision,
            })),
            totalCount: campaignHousingCount,
            page,
            perPage
        }
    } catch (err) {
        console.error('Listing campaign housing failed', err);
        throw new Error('Listing campaign housing failed');
    }
}

const updateList = async (campaignId: string, campaignHousingUpdateApi: CampaignHousingUpdateApi, housingIds: string[]): Promise<CampaignHousingApi[]> => {

    console.log('update', campaignId, housingIds)

    try {
        return db(campaignsHousingTable)
            .whereIn('housing_id', housingIds)
            .andWhere('campaign_id', campaignId)
            .update({
                status: campaignHousingUpdateApi.status,
                step: campaignHousingUpdateApi.step,
                precision: campaignHousingUpdateApi.precision,
            })
            .returning('*');
    } catch (err) {
        console.error('Updating campaign housing list failed', err, campaignId, housingIds);
        throw new Error('Updating campaign housing list failed');
    }
}

export default {
    insertHousingList,
    getHousingOwnerIds,
    removeHousingFromCampaign,
    listCampaignHousing,
    updateList
}
