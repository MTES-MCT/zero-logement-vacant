import { HousingStatus } from '@zerologementvacant/models';
import pMap from 'p-map';

import { fromDateDBO } from '~/infra/database';
import { kysely } from '~/infra/database/kysely';
import { startKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { isSendDateReached } from '~/models/CampaignApi';
import {
  flipCampaignHousingsToWaiting,
  resolveSystemUser
} from '~/services/campaign-housing-service';

const logger = createLogger('flip-sent-campaign-housings');

// Each campaign flips in its own transaction/connection; a modest concurrency
// bound lets independent campaigns overlap instead of queuing behind each
// other one at a time, without saturating the pg pool this cron shares with
// nothing else.
const FLIP_CONCURRENCY = 5;

export interface FlipSentCampaignHousingsOptions {
  /** Current calendar date as `yyyy-MM-dd`. */
  today: string;
}

export interface FlipSentCampaignHousingsSummary {
  campaigns: number;
  housings: number;
  /** Number of campaigns whose flip failed and was skipped, not aborting the rest. */
  failed: number;
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
  const rows = await kysely
    .selectFrom('campaignsHousing')
    .innerJoin('campaigns', 'campaigns.id', 'campaignsHousing.campaignId')
    .innerJoin('fastHousing', (join) =>
      join
        .onRef('fastHousing.id', '=', 'campaignsHousing.housingId')
        .onRef('fastHousing.geoCode', '=', 'campaignsHousing.housingGeoCode')
    )
    .where('campaigns.sentAt', 'is not', null)
    .where('fastHousing.status', '=', HousingStatus.NEVER_CONTACTED)
    .select(['campaigns.id as id', 'campaigns.sentAt as sentAt'])
    .distinct()
    .execute();

  const campaignIds = rows
    .filter((row) =>
      isSendDateReached(fromDateDBO(row.sentAt!).slice(0, 10), options.today)
    )
    .map((row) => row.id);
  logger.info(`Found ${campaignIds.length} campaign(s) to settle`);

  let housings = 0;
  let failed = 0;
  if (campaignIds.length > 0) {
    const system = await resolveSystemUser();
    const flipped = await pMap(
      campaignIds,
      async (id) => {
        try {
          // Only counted once this resolves, i.e. after the transaction has
          // committed — a commit failure must not credit housings that were
          // rolled back.
          return await startKyselyTransaction(() =>
            flipCampaignHousingsToWaiting({ id }, system)
          );
        } catch (error) {
          failed += 1;
          logger.error('Failed to flip campaign housings to WAITING', {
            campaign: id,
            error
          });
          return 0;
        }
      },
      { concurrency: FLIP_CONCURRENCY }
    );
    housings = flipped.reduce((sum, count) => sum + count, 0);
  }

  logger.info('Settled sent-campaign housings', {
    campaigns: campaignIds.length,
    housings,
    failed
  });
  return { campaigns: campaignIds.length, housings, failed };
}
