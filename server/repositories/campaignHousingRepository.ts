import db from './db';
import { housingTable, ownersHousingTable } from './housingRepository';
import { ownerTable } from './ownerRepository';

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

export default {
    insertHousingList,
    getHousingOwnerIds,
    removeHousingFromCampaign
}
