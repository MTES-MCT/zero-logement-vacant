import { CampaignApi } from '../models/CampaignApi';
import db from './db';
import { campaignsHousingTable } from './campaignHousingRepository';
import { housingTable } from './housingRepository';
import { ownerTable } from './ownerRepository';

export const campaignsTable = 'campaigns';


const get = async (campaignId: string): Promise<CampaignApi> => {
    try {
        return db(campaignsTable)
            .select(`${campaignsTable}.*`)
            .count(`${campaignsTable}.id`, {as: 'housingCount'})
            .countDistinct('o.id', {as: 'ownerCount'})
            .from(campaignsTable)
            .where(`${campaignsTable}.id`, campaignId)
            .leftJoin(campaignsHousingTable, 'id', `${campaignsHousingTable}.campaign_id`)
            .join(housingTable, `${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .joinRaw(`join ${ownerTable} as o on (invariant = any(o.invariants))`)
            .groupBy(`${campaignsTable}.id`)
            .first()
            .then((result: any) => parseCampaignApi(result))
    } catch (err) {
        console.error('Getting campaign failed', err, campaignId);
        throw new Error('Getting campaigns failed');
    }
}

const list = async (): Promise<CampaignApi[]> => {
    try {
        return db
            .select(`${campaignsTable}.*`)
            .count(`${campaignsTable}.id`, {as: 'housingCount'})
            .countDistinct('o.id', {as: 'ownerCount'})
            .from(campaignsTable)
            .leftJoin(campaignsHousingTable, 'id', `${campaignsHousingTable}.campaign_id`)
            .join(housingTable, `${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .joinRaw(`join ${ownerTable} as o on (invariant = any(o.invariants))`)
            .groupBy(`${campaignsTable}.id`)
            .then(_ => _.map((result: any) => parseCampaignApi(result)))
    } catch (err) {
        console.error('Listing campaigns failed', err);
        throw new Error('Listing campaigns failed');
    }
}

const lastCampaignNumber = async (): Promise<any> => {
    try {
        return db(campaignsTable)
            .max('campaign_number')
            .first()
            .then(_ => _ ? _.max : 0);
    } catch (err) {
        console.error('Listing campaigns failed', err);
        throw new Error('Listing campaigns failed');
    }
}

const insert = async (campaignApi: CampaignApi): Promise<CampaignApi> => {
    try {
        return db(campaignsTable)
            .insert({
                campaign_number: campaignApi.campaignNumber,
                start_month: campaignApi.startMonth,
                kind: campaignApi.kind,
                filters: campaignApi.filters
            })
            .returning('*')
            .then(_ => parseCampaignApi(_[0]))
    } catch (err) {
        console.error('Inserting campaign failed', err, campaignApi);
        throw new Error('Inserting campaign failed');
    }
}

const update = async (campaignApi: CampaignApi): Promise<string> => {
    try {
        return db(campaignsTable)
            .where('id', campaignApi.id)
            .update(formatCampaignApi(campaignApi))
            .returning('*')
            .then(_ => _[0])
    } catch (err) {
        console.error('Updating campaign failed', err, campaignApi);
        throw new Error('Updating campaign failed');
    }
}

const parseCampaignApi = (result: any) => <CampaignApi>{
    id: result.id,
    campaignNumber: result.campaign_number,
    startMonth: result.start_month,
    kind: result.kind,
    filters: result.filters,
    createdAt: result.created_at,
    validatedAt: result.validated_at,
    exportedAt: result.exported_at,
    sentAt: result.sent_at,
    housingCount: result.housingCount,
    ownerCount: result.ownerCount
}

const formatCampaignApi = (campaignApi: CampaignApi) => ({
    id: campaignApi.id,
    campaign_number: campaignApi.campaignNumber,
    start_month: campaignApi.startMonth,
    kind: campaignApi.kind,
    filters: campaignApi.filters,
    created_at: campaignApi.createdAt,
    validated_at: campaignApi.validatedAt,
    exported_at: campaignApi.exportedAt,
    sent_at: campaignApi.sentAt
})

export default {
    get,
    list,
    lastCampaignNumber,
    insert,
    update
}
