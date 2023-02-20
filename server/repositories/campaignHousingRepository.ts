import db from './db';

export const campaignsHousingTable = 'campaigns_housing';

const insertHousingList = async (
  campaignId: string,
  housingIds: string[]
): Promise<string[]> => {
  try {
    return db(campaignsHousingTable)
      .insert(
        housingIds.map((housingId) => ({
          campaign_id: campaignId,
          housing_id: housingId,
        }))
      )
      .onConflict(['campaign_id', 'housing_id'])
      .ignore()
      .returning('housing_id');
  } catch (err) {
    console.error('Inserting housing list failed', err, campaignId);
    throw new Error('Inserting housing list failed');
  }
};

const deleteHousingFromCampaigns = async (
  campaignIds: string[],
  housingIds?: string[]
): Promise<number> => {
  try {
    return db(campaignsHousingTable)
      .delete()
      .whereIn('campaign_id', campaignIds)
      .modify((queryBuilder: any) => {
        if (housingIds) {
          queryBuilder.whereIn('housing_id', housingIds);
        }
      });
  } catch (err) {
    console.error(
      'Removing housing from campaign failed',
      err,
      campaignIds,
      housingIds
    );
    throw new Error('Removing housing from campaign failed');
  }
};

export default {
  insertHousingList,
  deleteHousingFromCampaigns,
};
