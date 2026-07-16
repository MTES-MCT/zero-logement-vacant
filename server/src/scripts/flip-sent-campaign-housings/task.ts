import { HousingStatus } from '@zerologementvacant/models';

import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import {
  campaignsHousingTable,
  CampaignsHousing
} from '~/repositories/campaignHousingRepository';
import { campaignsTable } from '~/repositories/campaignRepository';
import { housingTable } from '~/repositories/housingRepository';
import { flipCampaignHousingsToWaiting } from '~/services/campaignHousingService';

const logger = createLogger('flip-sent-campaign-housings');

export interface FlipSentCampaignHousingsOptions {
  /** Current calendar date as `yyyy-MM-dd`. */
  today: string;
}

export interface FlipSentCampaignHousingsSummary {
  campaigns: number;
  housings: number;
}

/**
 * Find campaigns whose `sent_at` date has arrived and that still hold at least
 * one NEVER_CONTACTED housing, and flip those housings to WAITING. Idempotent:
 * settled campaigns are excluded by the NEVER_CONTACTED join, and each flip is a
 * no-op if nothing remains.
 */
export async function flipSentCampaignHousings(
  options: FlipSentCampaignHousingsOptions
): Promise<FlipSentCampaignHousingsSummary> {
  const rows = await CampaignsHousing()
    .join(
      campaignsTable,
      `${campaignsTable}.id`,
      `${campaignsHousingTable}.campaign_id`
    )
    .join(housingTable, function () {
      this.on(
        `${housingTable}.id`,
        '=',
        `${campaignsHousingTable}.housing_id`
      ).andOn(
        `${housingTable}.geo_code`,
        '=',
        `${campaignsHousingTable}.housing_geo_code`
      );
    })
    .whereNotNull(`${campaignsTable}.sent_at`)
    .whereRaw(`${campaignsTable}.sent_at::date <= ?::date`, [options.today])
    .where(`${housingTable}.status`, HousingStatus.NEVER_CONTACTED)
    .distinct(`${campaignsTable}.id as id`);

  const campaignIds = rows.map((row) => row.id as string);
  logger.info(`Found ${campaignIds.length} campaign(s) to settle`);

  let housings = 0;
  for (const id of campaignIds) {
    await startTransaction(async () => {
      housings += await flipCampaignHousingsToWaiting({ id });
    });
  }

  logger.info('Settled sent-campaign housings', {
    campaigns: campaignIds.length,
    housings
  });
  return { campaigns: campaignIds.length, housings };
}
