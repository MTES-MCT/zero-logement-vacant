import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { CampaignApi } from '~/models/CampaignApi';
import { HousingApi } from '~/models/HousingApi';

export const campaignsHousingTable = 'campaigns_housing';
export const CampaignsHousing = (transaction = db) =>
  transaction<CampaignHousingDBO>(campaignsHousingTable);

const insertHousingList = async (
  campaignId: string,
  housingList: HousingApi[]
): Promise<void> => {
  await withinTransaction(async (transaction) => {
    await CampaignsHousing(transaction)
      .insert(
        housingList.map((housing) => ({
          campaign_id: campaignId,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        }))
      )
      .onConflict(['campaign_id', 'housing_id', 'housing_geo_code'])
      .ignore()
      .returning('housing_id');
  });
};

async function removeMany(
  campaign: CampaignApi,
  housings: HousingApi[]
): Promise<void> {
  if (housings?.length === 0) {
    return;
  }

  await withinTransaction(async (transaction) => {
    await CampaignsHousing(transaction)
      .where({ campaign_id: campaign.id })
      .whereIn(
        ['housing_geo_code', 'housing_id'],
        housings.map((housing) => [housing.geoCode, housing.id])
      )
      .delete();
  });
}

export interface CampaignHousingDBO {
  campaign_id: string;
  housing_id: string;
  housing_geo_code: string;
  advice?: string;
}

export const formatCampaignHousingApi = (
  campaign: CampaignApi,
  housingList: HousingApi[]
): CampaignHousingDBO[] => {
  return housingList.map((housing) => ({
    campaign_id: campaign.id,
    housing_id: housing.id,
    housing_geo_code: housing.geoCode
  }));
};

export default {
  insertHousingList,
  removeMany
};
