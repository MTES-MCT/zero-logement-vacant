import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';

import config from '~/infra/config';
import { logger } from '~/infra/logger';
import type { CampaignApi } from '~/models/CampaignApi';
import type { HousingEventApi } from '~/models/EventApi';
import type { HousingApi, HousingId } from '~/models/HousingApi';
import type { UserApi } from '~/models/UserApi';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';

/**
 * Resolve the system account used to attribute automated status flips.
 * Returns `null` (after logging) instead of throwing so a misconfigured or
 * deleted account defers the flip to the next scheduled run rather than
 * rolling back the caller's own otherwise-valid campaign create/update.
 */
export async function resolveSystemUser(): Promise<UserApi | null> {
  const system = await userRepository.getByEmail(config.app.system);
  if (!system) {
    logger.error(
      'Unable to resolve the system account used to attribute automated ' +
        'campaign-housing status flips; the flip will be skipped and ' +
        'retried by the next scheduled run.',
      { email: config.app.system }
    );
    return null;
  }
  return system;
}

/**
 * Flip an already-selected set of NEVER_CONTACTED housings to WAITING, writing
 * one `housing:status-updated` event per housing actually flipped. The caller
 * is responsible for resolving `system` (see {@link resolveSystemUser}) and
 * for owning the transaction (the repository writes join the ambient one).
 * Returns the number flipped.
 *
 * The write is an atomic conditional transition (`onlyIfStatus:
 * NEVER_CONTACTED`), not a blind overwrite: `housings` may be a snapshot the
 * caller read before the transaction started (`createFromGroup` passes
 * in-memory housings since `housingRepository.find` cannot see rows written
 * earlier in the same transaction), so a concurrent writer may have already
 * moved a housing off NEVER_CONTACTED by the time this runs. Only the rows
 * still NEVER_CONTACTED at write time are updated and get an event — this
 * prevents two concurrent flip triggers (e.g. the daily cron and a
 * caseworker's PUT /campaigns/:id) from both flipping the same housing and
 * each writing its own, partly duplicate, status-updated event.
 *
 * The flip is the send-date rule the system applies, not a manual status edit,
 * so the events are attributed to the system account (`config.app.system`) —
 * uniformly across campaign creation, update and the daily cron. That also keeps
 * `isSupervised` from counting the automated change as human-touched, since a
 * `@…beta.gouv.fr` creator is not treated as user-modified.
 */
export async function flipHousingsToWaiting(
  housings: ReadonlyArray<Pick<HousingApi, 'id' | 'geoCode'>>,
  system: UserApi
): Promise<number> {
  if (housings.length === 0) {
    return 0;
  }

  const flipped = await housingRepository.updateMany(
    housings.map<HousingId>((housing) => ({
      geoCode: housing.geoCode,
      id: housing.id
    })),
    { status: HousingStatus.WAITING, subStatus: null },
    { onlyIfStatus: HousingStatus.NEVER_CONTACTED }
  );

  if (flipped.length === 0) {
    return 0;
  }

  const now = new Date().toJSON();
  const events = flipped.map<HousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
    createdAt: now,
    createdBy: system.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  }));
  await eventRepository.insertManyHousingEvents(events);

  return flipped.length;
}

/**
 * Fetch a campaign's still-NEVER_CONTACTED housings and flip them to WAITING.
 * Idempotent: a campaign whose housings are all past NEVER_CONTACTED yields an
 * empty set and writes nothing. Runs within the caller's transaction.
 */
export async function flipCampaignHousingsToWaiting(
  campaign: Pick<CampaignApi, 'id'>,
  system: UserApi
): Promise<number> {
  const housings = await housingRepository.find({
    filters: {
      campaignIds: [campaign.id],
      status: HousingStatus.NEVER_CONTACTED
    },
    pagination: { paginate: false }
  });
  return flipHousingsToWaiting(housings, system);
}
