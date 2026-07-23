import { HousingStatus } from '@zerologementvacant/models';

import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { isSendDateReached } from '~/models/CampaignApi';
import {
  campaignsHousingTable,
  CampaignsHousing
} from '~/repositories/campaignHousingRepository';
import { campaignsTable } from '~/repositories/campaignRepository';
import { housingTable } from '~/repositories/housingRepository';
import {
  flipCampaignHousingsToWaiting,
  resolveSystemUser
} from '~/services/campaign-housing-service';

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
  // Filter candidates in JS with the same isSendDateReached() the controller
  // uses, rather than truncating `sent_at` in raw SQL: `sent_at` is a
  // tz-less `timestamp`, so a raw `::date` cast reads whatever wall-clock
  // digits were stored (which can differ from the app's reconstructed
  // calendar date by a day depending on the writer's local offset) and could
  // disagree with the controller's decision for the same campaign.
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
    .where(`${housingTable}.status`, HousingStatus.NEVER_CONTACTED)
    .distinct(
      `${campaignsTable}.id as id`,
      `${campaignsTable}.sent_at as sentAt`
    );

  const campaignIds = rows
    .filter((row) =>
      isSendDateReached(
        (row.sentAt as Date).toJSON().slice(0, 10),
        options.today
      )
    )
    .map((row) => row.id as string);
  logger.info(`Found ${campaignIds.length} campaign(s) to settle`);

  let housings = 0;
  if (campaignIds.length > 0) {
    const system = await resolveSystemUser();
    if (system) {
      for (const id of campaignIds) {
        await startTransaction(async () => {
          housings += await flipCampaignHousingsToWaiting({ id }, system);
        });
      }
    }
  }

  logger.info('Settled sent-campaign housings', {
    campaigns: campaignIds.length,
    housings
  });
  return { campaigns: campaignIds.length, housings };
}
