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
import {
  HousingStatusApi,
  InProgressWithSupportSubStatus,
} from '../models/HousingStatusApi';

export const campaignsTable = 'campaigns';

const getCampaign = async (campaignId: string): Promise<CampaignApi | null> => {
  const campaign = await db(campaignsTable)
    .select(
      `${campaignsTable}.*`,
      db.raw(
        `count(*) filter (where ${housingTable}.status = '${HousingStatusApi.NeverContacted}') as "neverContactedCount"`
      ),
      db.raw(
        `count(*) filter (where ${housingTable}.status = '${HousingStatusApi.Waiting}') as "waitingCount"`
      ),
      db.raw(
        `count(*) filter (where ${housingTable}.status = '${HousingStatusApi.InProgress}') as "inProgressCount"`
      ),
      db.raw(
        `count(*) filter (where ${housingTable}.status = '${HousingStatusApi.Completed}') as "notVacantCount"`
      ),
      db.raw(
        `count(*) filter (where ${housingTable}.status = '${HousingStatusApi.Blocked}') as "noActionCount"`
      ),
      db.raw(
        `count(*) filter (where ${housingTable}.sub_status = 'NPAI') as "npaiCount"`
      ),
      db.raw(
        `count(*) filter (where ${housingTable}.status = '${HousingStatusApi.InProgress}' and ${housingTable}.sub_status = '${InProgressWithSupportSubStatus}') as "inProgressWithSupportCount"`
      )
    )
    .count(`${campaignsHousingTable}.housing_id`, { as: 'housingCount' })
    .countDistinct('o.id', { as: 'ownerCount' })
    .from(campaignsTable)
    .where(`${campaignsTable}.id`, campaignId)
    .leftJoin(
      campaignsHousingTable,
      'id',
      `${campaignsHousingTable}.campaign_id`
    )
    .leftJoin(
      housingTable,
      `${housingTable}.id`,
      `${campaignsHousingTable}.housing_id`
    )
    .leftJoin(ownersHousingTable, ownersHousingJoinClause)
    .leftJoin({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
    .groupBy(`${campaignsTable}.id`)
    .first();

  return campaign ? parseCampaignApi(campaign) : null;
};

const getCampaignBundle = async (
  establishmentId: string,
  campaignNumber?: string,
  reminderNumber?: string,
  query?: string
): Promise<CampaignBundleApi | null> => {
  const bundle = await db(campaignsTable)
    .select(
      db.raw(`array_agg(distinct(${campaignsTable}.id)) as "campaignIds"`),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.NeverContacted}') as "neverContactedCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.Waiting}') as "waitingCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.InProgress}') as "inProgressCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.Completed}') as "notVacantCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.Blocked}') as "noActionCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.sub_status = 'NPAI') as "npaiCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.InProgress}' and ${housingTable}.sub_status = '${InProgressWithSupportSubStatus}') as "inProgressWithSupportCount"`
      )
    )
    .countDistinct(`${housingTable}.id`, { as: 'housingCount' })
    .countDistinct('o.id', { as: 'ownerCount' })
    .from(campaignsTable)
    .where(`${campaignsTable}.establishment_id`, establishmentId)
    .leftJoin(
      campaignsHousingTable,
      'id',
      `${campaignsHousingTable}.campaign_id`
    )
    .leftJoin(housingTable, (join) => {
      join
        .on(`${housingTable}.id`, `${campaignsHousingTable}.housing_id`)
        .andOn(
          `${housingTable}.geo_code`,
          `${campaignsHousingTable}.housing_geo_code`
        );
    })
    .leftJoin(ownersHousingTable, ownersHousingJoinClause)
    .leftJoin({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
    .modify((queryBuilder: any) => {
      if (campaignNumber) {
        queryBuilder
          .select(
            `${campaignsTable}.campaign_number`,
            db.raw(
              `(array_agg(${campaignsTable}.created_at order by reminder_number asc))[1] as "created_at"`
            ),
            db.raw(
              `(array_agg(${campaignsTable}.kind order by reminder_number asc))[1] as "kind"`
            ),
            db.raw(
              `(array_agg(${campaignsTable}.filters order by reminder_number asc))[1] as "filters"`
            ),
            db.raw(
              `(array_agg(${campaignsTable}.title order by reminder_number asc))[1] as "title"`
            )
          )
          .andWhere(`${campaignsTable}.campaign_number`, campaignNumber)
          .groupBy(`${campaignsTable}.campaign_number`);
      } else {
        queryBuilder
          .andWhereRaw(`${campaignsTable}.sending_date is not null`)
          .andWhereRaw(`${campaignsTable}.archived_at is null`);
      }
      if (reminderNumber) {
        queryBuilder
          .select(`${campaignsTable}.reminder_number`)
          .andWhere(`${campaignsTable}.reminder_number`, reminderNumber)
          .groupBy(`${campaignsTable}.reminder_number`);
      }
      queryOwnerHousingWhereClause(queryBuilder, query);
    })
    .first();

  return bundle ? parseCampaignBundleApi(bundle) : null;
};

const listCampaigns = async (
  establishmentId: string
): Promise<CampaignApi[]> => {
  const campaigns = await db(campaignsTable)
    .where('establishment_id', establishmentId)
    .orderBy('campaign_number')
    .orderBy('reminder_number');

  return campaigns.map(parseCampaignApi);
};

const listCampaignBundles = async (
  establishmentId: string
): Promise<CampaignBundleApi[]> => {
  const bundles = await db
    .select(
      db.raw(`array_agg(distinct(${campaignsTable}.id)) as "campaignIds"`),
      `${campaignsTable}.campaign_number`,
      db.raw(
        `(array_agg(${campaignsTable}.kind order by reminder_number asc))[1] as "kind"`
      ),
      db.raw(
        `(array_agg(${campaignsTable}.filters order by reminder_number asc))[1] as "filters"`
      ),
      db.raw(
        `(array_agg(${campaignsTable}.created_at order by reminder_number asc))[1] as "created_at"`
      ),
      db.raw(
        `(array_agg(${campaignsTable}.title order by reminder_number asc))[1] as "title"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.NeverContacted}') as "neverContactedCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.Waiting}') as "waitingCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.InProgress}') as "inProgressCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.Completed}') as "notVacantCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.Blocked}') as "noActionCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.sub_status = 'NPAI') as "npaiCount"`
      ),
      db.raw(
        `count(distinct ${housingTable}.id) filter (where ${housingTable}.status = '${HousingStatusApi.InProgress}' and ${housingTable}.sub_status = '${InProgressWithSupportSubStatus}') as "inProgressWithSupportCount"`
      )
    )
    .countDistinct(`${housingTable}.id`, { as: 'housingCount' })
    .countDistinct('o.id', { as: 'ownerCount' })
    .from(campaignsTable)
    .leftJoin(
      campaignsHousingTable,
      'id',
      `${campaignsHousingTable}.campaign_id`
    )
    .leftJoin(
      housingTable,
      `${housingTable}.id`,
      `${campaignsHousingTable}.housing_id`
    )
    .leftJoin(ownersHousingTable, ownersHousingJoinClause)
    .leftJoin({ o: ownerTable }, `${ownersHousingTable}.owner_id`, `o.id`)
    .where(`${campaignsTable}.establishment_id`, establishmentId)
    .orderBy('campaign_number')
    .groupBy(`${campaignsTable}.campaign_number`);

  return bundles.map((result: any) => parseCampaignBundleApi(result));
};

const lastCampaignNumber = async (establishmentId: string): Promise<any> => {
  try {
    return db(campaignsTable)
      .where('establishment_id', establishmentId)
      .max('campaign_number')
      .first()
      .then((_) => (_ ? _.max : 0));
  } catch (err) {
    console.error('Listing campaigns failed', err);
    throw new Error('Listing campaigns failed');
  }
};

const lastReminderNumber = async (
  establishmentId: string,
  campaignNumber: number
): Promise<any> => {
  try {
    return db(campaignsTable)
      .where('establishment_id', establishmentId)
      .andWhere('campaign_number', campaignNumber)
      .max('reminder_number')
      .first()
      .then((_) => (_ ? _.max : 0));
  } catch (err) {
    console.error('Listing campaigns failed', err);
    throw new Error('Listing campaigns failed');
  }
};

const insert = async (campaignApi: CampaignApi): Promise<CampaignApi> => {
  console.log(
    'Insert campaignApi for establishment',
    campaignApi.establishmentId
  );
  try {
    return db(campaignsTable)
      .insert(formatCampaignApi(campaignApi))
      .returning('*')
      .then((_) => parseCampaignApi(_[0]));
  } catch (err) {
    console.error('Inserting campaign failed', err, campaignApi);
    throw new Error('Inserting campaign failed');
  }
};

const update = async (campaignApi: CampaignApi): Promise<string> => {
  try {
    return db(campaignsTable)
      .where('id', campaignApi.id)
      .update(formatCampaignApi(campaignApi))
      .returning('*')
      .then((_) => _[0]);
  } catch (err) {
    console.error('Updating campaign failed', err, campaignApi);
    throw new Error('Updating campaign failed');
  }
};

const deleteCampaigns = async (campaignIds: string[]): Promise<number> => {
  try {
    return db(campaignsTable).delete().whereIn('id', campaignIds);
  } catch (err) {
    console.error('Deleting campaigns', err, deleteCampaigns);
    throw new Error('Deleting campaigns failed');
  }
};

const parseCampaignApi = (result: any) =>
  <CampaignApi>{
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
    archivedAt: result.archived_at,
    sendingDate: result.sending_date,
    confirmedAt: result.confirmed_at,
    title: result.title,
  };

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
  archived_at: campaignApi.archivedAt,
  sending_date: campaignApi.sendingDate
    ? new Date(campaignApi.sendingDate)
    : undefined,
  confirmed_at: campaignApi.confirmedAt,
});

const parseCampaignBundleApi = (result: any) =>
  <CampaignBundleApi>{
    campaignIds: result.campaignIds,
    campaignNumber: result.campaign_number,
    reminderNumber: result.reminder_number,
    createdAt: result.created_at,
    title: result.title,
    kind: result.kind,
    filters: result.filters,
    housingCount: result.housingCount,
    neverContactedCount: result.neverContactedCount,
    waitingCount: result.waitingCount,
    inProgressCount: result.inProgressCount,
    notVacantCount: result.notVacantCount,
    noActionCount: result.noActionCount,
    npaiCount: result.npaiCount,
    inProgressWithSupportCount: result.inProgressWithSupportCount,
    ownerCount: result.ownerCount,
  };

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
  formatCampaignApi,
};
