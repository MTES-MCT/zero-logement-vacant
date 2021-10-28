import { CampaignApi } from '../models/CampaignApi';
import db from './db';

export const campaignsTable = 'campaigns';


const get = async (campaignId: string): Promise<CampaignApi> => {
    try {
        return db(campaignsTable)
            .where('id', campaignId)
            .first();
    } catch (err) {
        console.error('Getting campaign failed', err, campaignId);
        throw new Error('Getting campaigns failed');
    }
}

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

const update = async (campaignApi: CampaignApi): Promise<CampaignApi> => {
    try {
        return db(campaignsTable)
            .where('id', campaignApi.id)
            .update(campaignApi)
            .returning('*')
            .then(_ => _[0]);
    } catch (err) {
        console.error('Inserting campaign failed', err, campaignApi);
        throw new Error('Inserting campaign failed');
    }
}

export default {
    get,
    list,
    insert,
    update
}
