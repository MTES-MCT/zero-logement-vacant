import db from './db';

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

export default {
    insertHousingList
}
