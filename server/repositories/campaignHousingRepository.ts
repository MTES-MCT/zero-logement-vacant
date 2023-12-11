import db from './db';
import { HousingApi } from '../models/HousingApi';

export const campaignsHousingTable = 'campaigns_housing';
export const CampaignsHousing = () =>
  db<CampaignHousingDBO>(campaignsHousingTable);

const insertHousingList = async (
  campaignId: string,
  housingList: HousingApi[]
): Promise<void> => {
  await CampaignsHousing()
    .insert(
      housingList.map((housing) => ({
        campaign_id: campaignId,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode,
      }))
    )
    .onConflict(['campaign_id', 'housing_id', 'housing_geo_code'])
    .ignore()
    .returning('housing_id');
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

export interface CampaignHousingDBO {
  campaign_id: string;
  housing_id: string;
  housing_geo_code: string;
  advice?: string;
}

export default {
  insertHousingList,
  deleteHousingFromCampaigns,
};
