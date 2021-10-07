import { CampaignApi } from '../models/CampaignApi';
import db from './db';

const campaignsTable = 'campaigns';

const list = async (): Promise<CampaignApi[]> => {
    try {
        return db.select().from(campaignsTable)
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

export default {
    list,
    insert
}
