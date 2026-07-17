import { Array } from 'effect';
import pMap from 'p-map';

import db from '~/infra/database';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { CampaignApi } from '~/models/CampaignApi';
import { HousingApi } from '~/models/HousingApi';

export const campaignsHousingTable = 'campaigns_housing';
export const CampaignsHousing = (transaction = db) =>
  transaction<CampaignHousingDBO>(campaignsHousingTable);

// Matches Knex's batchInsert default chunk size, replicated manually to keep the
// bulk delete under Postgres's 65535 bind-parameter limit (2 params per housing).
const INSERT_BATCH_SIZE = 1000;

const insertHousingList = async (
  campaignId: string,
  housingList: HousingApi[]
): Promise<void> => {
  if (housingList.length === 0) {
    return;
  }

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('campaignsHousing')
      .values(
        housingList.map((housing) => ({
          campaignId,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        }))
      )
      .onConflict((oc) =>
        oc.columns(['campaignId', 'housingId', 'housingGeoCode']).doNothing()
      )
      .execute();
  });
};

async function removeMany(
  campaign: Pick<CampaignApi, 'id'>,
  housings: HousingApi[]
): Promise<void> {
  if (housings?.length === 0) {
    return;
  }

  await withinKyselyTransaction(async (trx) => {
    await pMap(
      Array.chunksOf(housings, INSERT_BATCH_SIZE),
      async (batch) => {
        await trx
          .deleteFrom('campaignsHousing')
          .where('campaignId', '=', campaign.id)
          .where((eb) =>
            eb.or(
              batch.map((housing) =>
                eb.and([
                  eb('housingGeoCode', '=', housing.geoCode),
                  eb('housingId', '=', housing.id)
                ])
              )
            )
          )
          .execute();
      },
      { concurrency: 1 }
    );
  });
}

export interface CampaignHousingDBO {
  campaign_id: string;
  housing_id: string;
  housing_geo_code: string;
  advice?: string;
}

export const formatCampaignHousingApi = (
  campaign: Pick<CampaignApi, 'id'>,
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
