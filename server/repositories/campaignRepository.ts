import { CampaignApi } from '../models/CampaignApi';
import db from './db';
import { campaignsHousingTable } from './campaignHousingRepository';
import { housingTable, ownersHousingTable } from './housingRepository';
import { ownerTable } from './ownerRepository';
import { CampaignHousingStatusApi } from '../models/CampaignHousingStatusApi';

export const campaignsTable = 'campaigns';


const get = async (campaignId: string): Promise<CampaignApi> => {
    try {
        return db(campaignsTable)
            .select(
                `${campaignsTable}.*`,
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.Waiting}') as "waitingCount"`),
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.InProgress}') as "inProgressCount"`),
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.NotVacant}') as "notVacantCount"`),
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.NoAction}') as "noActionCount"`),
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.Exit}') as "exitCount"`)
            )
            .count(`${campaignsTable}.id`, {as: 'housingCount'})
            .countDistinct('o.id', {as: 'ownerCount'})
            .from(campaignsTable)
            .where(`${campaignsTable}.id`, campaignId)
            .join(campaignsHousingTable, 'id', `${campaignsHousingTable}.campaign_id`)
            .join(housingTable, `${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .groupBy(`${campaignsTable}.id`)
            .first()
            .then((result: any) => parseCampaignApi(result))
    } catch (err) {
        console.error('Getting campaign failed', err, campaignId);
        throw new Error('Getting campaigns failed');
    }
}

const list = async (establishmentId: string): Promise<CampaignApi[]> => {

    try {
        return db
            .select(
                `${campaignsTable}.*`,
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.Waiting}') as "waitingCount"`),
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.InProgress}') as "inProgressCount"`),
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.NotVacant}') as "notVacantCount"`),
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.NoAction}') as "noActionCount"`),
                db.raw(`count(*) filter (where campaigns_housing.status = '${CampaignHousingStatusApi.Exit}') as "exitCount"`)
            )
            .count(`${campaignsTable}.id`, {as: 'housingCount'})
            .countDistinct('o.id', {as: 'ownerCount'})
            .from(campaignsTable)
            .join(campaignsHousingTable, 'id', `${campaignsHousingTable}.campaign_id`)
            .join(housingTable, `${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .join(ownersHousingTable, `${housingTable}.id`, `${ownersHousingTable}.housing_id`)
            .join({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .where(`${campaignsTable}.establishment_id`, establishmentId)
            .orderBy('campaign_number')
            .orderBy('reminder_number')
            .groupBy(`${campaignsTable}.id`)
            .then(_ => _.map((result: any) => parseCampaignApi(result)))
    } catch (err) {
        console.error('Listing campaigns failed', err);
        throw new Error('Listing campaigns failed');
    }
}

const lastCampaignNumber = async (establishmentId: string): Promise<any> => {
    try {
        return db(campaignsTable)
            .where('establishment_id', establishmentId)
            .max('campaign_number')
            .first()
            .then(_ => _ ? _.max : 0);
    } catch (err) {
        console.error('Listing campaigns failed', err);
        throw new Error('Listing campaigns failed');
    }
}

const insert = async (campaignApi: CampaignApi): Promise<CampaignApi> => {

    console.log('campaignApi', campaignApi)
    try {
        return db(campaignsTable)
            .insert(formatCampaignApi(campaignApi))
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

const deleteCampaign = async (campaignId: string): Promise<number> => {
    try {
        return db(campaignsTable)
            .delete()
            .where('id', campaignId)
    } catch (err) {
        console.error('Deleting campaign failed', err, campaignId);
        throw new Error('Deleting campaign failed');
    }
}

const parseCampaignApi = (result: any) => <CampaignApi>{
    id: result.id,
    establishmentId: result.establishment_id,
    campaignNumber: result.campaign_number,
    startMonth: result.start_month,
    reminderNumber: result.reminder_number,
    filters: result.filters,
    createdBy: result.created_by,
    createdAt: result.created_at,
    validatedAt: result.validated_at,
    exportedAt: result.exported_at,
    sentAt: result.sent_at,
    housingCount: result.housingCount,
    waitingCount: result.waitingCount,
    inProgressCount: result.inProgressCount,
    notVacantCount: result.notVacantCount,
    noActionCount: result.noActionCount,
    exitCount: result.exitCount,
    ownerCount: result.ownerCount
}

const formatCampaignApi = (campaignApi: CampaignApi) => ({
    id: campaignApi.id,
    establishment_id: campaignApi.establishmentId,
    campaign_number: campaignApi.campaignNumber,
    start_month: campaignApi.startMonth,
    reminder_number: campaignApi.reminderNumber,
    filters: campaignApi.filters,
    created_by: campaignApi.createdBy,
    created_at: campaignApi.createdAt,
    validated_at: campaignApi.validatedAt,
    exported_at: campaignApi.exportedAt,
    sent_at: campaignApi.sentAt,
    sending_date: campaignApi.sendingDate ? new Date(campaignApi.sendingDate) : undefined,
})

export default {
    get,
    list,
    lastCampaignNumber,
    insert,
    update,
    deleteCampaign
}
