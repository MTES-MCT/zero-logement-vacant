import { HOUSING_STATUS_LABELS, HousingStatus } from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';

import type { CampaignApi } from '~/models/CampaignApi';
import type { HousingEventApi } from '~/models/EventApi';
import type { HousingApi, HousingId } from '~/models/HousingApi';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';

export interface FlipToWaitingOptions {
  /** User id recorded as the author of the `housing:status-updated` events. */
  createdBy: string;
}

/**
 * Flip an already-selected set of NEVER_CONTACTED housings to WAITING, writing
 * one `housing:status-updated` event per housing. The caller is responsible for
 * having filtered `housings` to NEVER_CONTACTED and for owning the transaction
 * (the repository writes join the ambient one). Returns the number flipped.
 *
 * `createFromGroup` calls this with housings it already holds in memory rather
 * than re-querying, because `housingRepository.find` does not see rows written
 * earlier in the same transaction.
 */
export async function flipHousingsToWaiting(
  housings: ReadonlyArray<Pick<HousingApi, 'id' | 'geoCode'>>,
  options: FlipToWaitingOptions
): Promise<number> {
  if (housings.length === 0) {
    return 0;
  }

  const now = new Date().toJSON();
  const events = housings.map<HousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
    createdAt: now,
    createdBy: options.createdBy,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  }));

  await Promise.all([
    housingRepository.updateMany(
      housings.map<HousingId>((housing) => ({
        geoCode: housing.geoCode,
        id: housing.id
      })),
      { status: HousingStatus.WAITING, subStatus: null }
    ),
    eventRepository.insertManyHousingEvents(events)
  ]);

  return housings.length;
}

/**
 * Fetch a campaign's still-NEVER_CONTACTED housings and flip them to WAITING.
 * Idempotent: a campaign whose housings are all past NEVER_CONTACTED yields an
 * empty set and writes nothing. Runs within the caller's transaction.
 */
export async function flipCampaignHousingsToWaiting(
  campaign: Pick<CampaignApi, 'id'>,
  options: FlipToWaitingOptions
): Promise<number> {
  const housings = await housingRepository.find({
    filters: {
      campaignIds: [campaign.id],
      status: HousingStatus.NEVER_CONTACTED
    },
    pagination: { paginate: false }
  });
  return flipHousingsToWaiting(housings, options);
}
