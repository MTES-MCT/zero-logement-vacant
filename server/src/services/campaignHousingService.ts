import { HOUSING_STATUS_LABELS, HousingStatus } from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';

import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import type { CampaignApi } from '~/models/CampaignApi';
import type { HousingEventApi } from '~/models/EventApi';
import type { HousingApi, HousingId } from '~/models/HousingApi';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';

/**
 * Flip an already-selected set of NEVER_CONTACTED housings to WAITING, writing
 * one `housing:status-updated` event per housing. The caller is responsible for
 * having filtered `housings` to NEVER_CONTACTED and for owning the transaction
 * (the repository writes join the ambient one). Returns the number flipped.
 *
 * The flip is the send-date rule the system applies, not a manual status edit,
 * so the events are attributed to the system account (`config.app.system`) —
 * uniformly across campaign creation, update and the daily cron. That also keeps
 * `isSupervised` from counting the automated change as human-touched, since a
 * `@…beta.gouv.fr` creator is not treated as user-modified.
 *
 * `createFromGroup` calls this with housings it already holds in memory rather
 * than re-querying, because `housingRepository.find` does not see rows written
 * earlier in the same transaction.
 */
export async function flipHousingsToWaiting(
  housings: ReadonlyArray<Pick<HousingApi, 'id' | 'geoCode'>>
): Promise<number> {
  if (housings.length === 0) {
    return 0;
  }

  const system = await userRepository.getByEmail(config.app.system);
  if (!system) {
    throw new UserMissingError(config.app.system);
  }

  const now = new Date().toJSON();
  const events = housings.map<HousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
    createdAt: now,
    createdBy: system.id,
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
  campaign: Pick<CampaignApi, 'id'>
): Promise<number> {
  const housings = await housingRepository.find({
    filters: {
      campaignIds: [campaign.id],
      status: HousingStatus.NEVER_CONTACTED
    },
    pagination: { paginate: false }
  });
  return flipHousingsToWaiting(housings);
}
