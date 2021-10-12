import db from './db';

export const campaignsHousingTable = 'campaigns_housing';

const getHousingList = async (campaignId: string): Promise<string[]> => {
    try {
        return db(campaignsHousingTable)
            .where('campaignId', campaignId)
            .returning('housingRef')
            .then(_ => _.map(_ => _.housingRef));
    } catch (err) {
        console.error('Listing housing for campaignId failed', err, campaignId);
        throw new Error('Listing housing for campaignId failed');
    }
}

const insertHousingList = async (campaignId: string, housingRefs: string[]): Promise<string[]> => {
    try {
        return db(campaignsHousingTable)
            .insert(housingRefs.map(housingRef => ({campaignId, housingRef})))
            .returning('housingRef')
    } catch (err) {
        console.error('Inserting housing list failed', err, campaignId);
        throw new Error('Inserting housing list failed');
    }
}

export default {
    getHousingList,
    insertHousingList
}
