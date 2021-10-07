import { CampaignApi } from '../models/CampaignApi';
import db from './db';

const campaignsTable = 'campaigns';
const campaignsHousingTable = 'campaigns_housing';

const list = async (): Promise<CampaignApi[]> => {
    try {
        return db(campaignsTable);
    } catch (err) {
        console.error('Listing campaigns failed', err);
        throw new Error('Listing campaigns failed');
    }
}

const insert = async (campaignApi: CampaignApi): Promise<CampaignApi> => {
    try {
        return db(campaignsTable)
            .insert(campaignApi)
            .returning('*')
            .then(_ => _[0]);
    } catch (err) {
        console.error('Inserting campaign failed', err, campaignApi);
        throw new Error('Inserting campaign failed');
    }
}

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

export default {
    list,
    insert,
    getHousingList
}
