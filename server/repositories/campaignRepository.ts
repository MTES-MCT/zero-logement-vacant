import { CampaignApi, CampaignBundleApi } from '../models/CampaignApi';
import db from './db';
import { campaignsHousingTable } from './campaignHousingRepository';
import {
    housingTable,
    ownersHousingJoinClause,
    ownersHousingTable,
    queryOwnerHousingWhereClause,
} from './housingRepository';
import { ownerTable } from './ownerRepository';
import { HousingStatusApi } from '../models/HousingStatusApi';

export const campaignsTable = 'campaigns';


const getCampaign = async (campaignId: string): Promise<CampaignApi | undefined> => {
    try {
        return db(campaignsTable)
            .select(
                `${campaignsTable}.*`,
                db.raw(`count(*) filter (where housing.status = '${HousingStatusApi.Waiting}') as "waitingCount"`),
                db.raw(`count(*) filter (where housing.status = '${HousingStatusApi.InProgress}') as "inProgressCount"`),
                db.raw(`count(*) filter (where housing.status = '${HousingStatusApi.NotVacant}') as "notVacantCount"`),
                db.raw(`count(*) filter (where housing.status = '${HousingStatusApi.NoAction}') as "noActionCount"`),
                db.raw(`count(*) filter (where housing.status = '${HousingStatusApi.Exit}') as "exitCount"`),
                db.raw(`count(*) filter (where housing.sub_status = 'NPAI') as "npaiCount"`)
            )
            .count(`${campaignsHousingTable}.housing_id`, {as: 'housingCount'})
            .countDistinct('o.id', {as: 'ownerCount'})
            .from(campaignsTable)
            .where(`${campaignsTable}.id`, campaignId)
            .leftJoin(campaignsHousingTable, 'id', `${campaignsHousingTable}.campaign_id`)
            .leftJoin(housingTable, `${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .leftJoin(ownersHousingTable, ownersHousingJoinClause)
            .leftJoin({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .groupBy(`${campaignsTable}.id`)
            .first()
            .then((result: any) => result ? parseCampaignApi(result) : result)
    } catch (err) {
        console.error('Getting campaign failed', err, campaignId);
        throw new Error('Getting campaigns failed');
    }
}

const getCampaignBundle = async (establishmentId: string, campaignNumber?: string, reminderNumber?: string, query?: string): Promise<CampaignBundleApi | undefined> => {
    try {
        return db(campaignsTable)
            .select(
                db.raw(`array_agg(distinct(${campaignsTable}.id)) as "campaignIds"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.Waiting}') as "waitingCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.InProgress}') as "inProgressCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.NotVacant}') as "notVacantCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.NoAction}') as "noActionCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.Exit}') as "exitCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.sub_status = 'NPAI') as "npaiCount"`)
            )
            .countDistinct(`${housingTable}.id`, {as: 'housingCount'})
            .countDistinct('o.id', {as: 'ownerCount'})
            .from(campaignsTable)
            .where(`${campaignsTable}.establishment_id`, establishmentId)
            .leftJoin(campaignsHousingTable, 'id', `${campaignsHousingTable}.campaign_id`)
            .leftJoin(housingTable, `${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .leftJoin(ownersHousingTable, ownersHousingJoinClause)
            .leftJoin({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .modify((queryBuilder: any) => {
                if (campaignNumber) {
                    queryBuilder
                        .select(
                            `${campaignsTable}.campaign_number`,
                            db.raw(`(array_agg(${campaignsTable}.kind order by reminder_number asc))[1] as "kind"`),
                            db.raw(`(array_agg(${campaignsTable}.filters order by reminder_number asc))[1] as "filters"`),
                            db.raw(`(array_agg(${campaignsTable}.title order by reminder_number asc))[1] as "title"`),
                        )
                        .andWhere(`${campaignsTable}.campaign_number`, campaignNumber)
                        .groupBy(`${campaignsTable}.campaign_number`)
                }
                if (reminderNumber) {
                    queryBuilder.andWhere(`${campaignsTable}.reminder_number`, reminderNumber)
                }
                queryOwnerHousingWhereClause(queryBuilder, query);
            })
            .first()
            .then((result: any) => result ? parseCampaignBundleApi({...result, reminder_number: reminderNumber}) : result)
    } catch (err) {
        console.error('Getting campaign bundle failed', err, establishmentId, campaignNumber, reminderNumber);
        throw new Error('Getting campaign bundle failed');
    }
}

const listCampaigns = async (establishmentId: string): Promise<CampaignApi[]> => {

    try {
        return db(campaignsTable)
            .where('establishment_id', establishmentId)
            .orderBy('campaign_number')
            .orderBy('reminder_number')
            .then(_ => _.map((result: any) => parseCampaignApi(result)))
    } catch (err) {
        console.error('Listing campaigns failed', err);
        throw new Error('Listing campaigns failed');
    }
}

const listCampaignBundles = async (establishmentId: string): Promise<CampaignBundleApi[]> => {

    try {
        return db
            .select(
                db.raw(`array_agg(distinct(${campaignsTable}.id)) as "campaignIds"`),
                `${campaignsTable}.campaign_number`,
                db.raw(`(array_agg(${campaignsTable}.kind order by reminder_number asc))[1] as "kind"`),
                db.raw(`(array_agg(${campaignsTable}.filters order by reminder_number asc))[1] as "filters"`),
                db.raw(`(array_agg(${campaignsTable}.created_at order by reminder_number asc))[1] as "created_at"`),
                db.raw(`(array_agg(${campaignsTable}.title order by reminder_number asc))[1] as "title"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.Waiting}') as "waitingCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.InProgress}') as "inProgressCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.NotVacant}') as "notVacantCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.NoAction}') as "noActionCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.status = '${HousingStatusApi.Exit}') as "exitCount"`),
                db.raw(`count(distinct ${housingTable}.id) filter (where housing.sub_status = 'NPAI') as "npaiCount"`)
            )
            .countDistinct(`${housingTable}.id`, {as: 'housingCount'})
            .countDistinct('o.id', {as: 'ownerCount'})
            .from(campaignsTable)
            .leftJoin(campaignsHousingTable, 'id', `${campaignsHousingTable}.campaign_id`)
            .leftJoin(housingTable, `${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
            .leftJoin(ownersHousingTable, ownersHousingJoinClause)
            .leftJoin({o: ownerTable}, `${ownersHousingTable}.owner_id`, `o.id`)
            .where(`${campaignsTable}.establishment_id`, establishmentId)
            .orderBy('campaign_number')
            .groupBy(`${campaignsTable}.campaign_number`)
            .then(_ => _.map((result: any) => parseCampaignBundleApi(result)))
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

const lastReminderNumber = async (establishmentId: string, campaignNumber: number): Promise<any> => {
    try {
        return db(campaignsTable)
            .where('establishment_id', establishmentId)
            .andWhere('campaign_number', campaignNumber)
            .max('reminder_number')
            .first()
            .then(_ => _ ? _.max : 0);
    } catch (err) {
        console.error('Listing campaigns failed', err);
        throw new Error('Listing campaigns failed');
    }
}

const insert = async (campaignApi: CampaignApi): Promise<CampaignApi> => {

    console.log('Insert campaignApi for establishment', campaignApi.establishmentId)
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

const deleteCampaigns = async (campaignIds: string[]): Promise<number> => {
    try {
        return db(campaignsTable)
            .delete()
            .whereIn('id', campaignIds)
    } catch (err) {
        console.error('Deleting campaigns', err, deleteCampaigns);
        throw new Error('Deleting campaigns failed');
    }
}

const parseCampaignApi = (result: any) => <CampaignApi>{
    id: result.id,
    establishmentId: result.establishment_id,
    campaignNumber: result.campaign_number,
    kind: result.kind,
    reminderNumber: result.reminder_number,
    filters: result.filters,
    createdBy: result.created_by,
    createdAt: result.created_at,
    validatedAt: result.validated_at,
    exportedAt: result.exported_at,
    sentAt: result.sent_at,
    sendingDate: result.sending_date,
    title: result.title
}

const formatCampaignApi = (campaignApi: CampaignApi) => ({
    id: campaignApi.id,
    establishment_id: campaignApi.establishmentId,
    campaign_number: campaignApi.campaignNumber,
    kind: campaignApi.kind,
    reminder_number: campaignApi.reminderNumber,
    filters: campaignApi.filters,
    title: campaignApi.title,
    created_by: campaignApi.createdBy,
    created_at: campaignApi.createdAt,
    validated_at: campaignApi.validatedAt,
    exported_at: campaignApi.exportedAt,
    sent_at: campaignApi.sentAt,
    sending_date: campaignApi.sendingDate ? new Date(campaignApi.sendingDate) : undefined
})

const parseCampaignBundleApi = (result: any) => <CampaignBundleApi>{
    campaignIds:result.campaignIds,
    campaignNumber: result.campaign_number,
    reminderNumber: result.reminder_number,
    createdAt: result.created_at,
    title: result.title,
    kind: result.kind,
    filters: result.filters,
    housingCount: result.housingCount,
    waitingCount: result.waitingCount,
    inProgressCount: result.inProgressCount,
    notVacantCount: result.notVacantCount,
    noActionCount: result.noActionCount,
    exitCount: result.exitCount,
    npaiCount: result.npaiCount,
    ownerCount: result.ownerCount
}

export default {
    getCampaign,
    getCampaignBundle,
    listCampaigns,
    listCampaignBundles,
    lastCampaignNumber,
    lastReminderNumber,
    insert,
    update,
    deleteCampaigns,
    formatCampaignApi
}
