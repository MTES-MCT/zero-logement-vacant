import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { chunksOf } from 'effect/Array';
import { v4 as uuidv4 } from 'uuid';

import config from '~/infra/config';
import { withinTransaction } from '~/infra/database/transaction';
import { logger } from '~/infra/logger';
import type { CampaignApi } from '~/models/CampaignApi';
import { isSendDateReached } from '~/models/CampaignApi';
import type { HousingEventApi } from '~/models/EventApi';
import type { HousingApi, HousingId } from '~/models/HousingApi';
import type { UserApi } from '~/models/UserApi';
import { Campaigns } from '~/repositories/campaignRepository';
import eventRepository, {
  EVENTS_TABLE,
  HOUSING_EVENTS_TABLE,
  HousingEvents
} from '~/repositories/eventRepository';
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

/**
 * Revert the housings a campaign's send-date rule auto-flipped, when that
 * campaign's `sentAt` is postponed to a future date. Only touches housings we
 * can prove the system auto-flipped and that nothing has touched since:
 *   1. no *other* attached campaign has genuinely sent (`sentAt <= today`) —
 *      the postponed campaign itself is excluded, it is future by construction;
 *   2. the housing's most recent `housing:status-updated` event is the pristine
 *      `Non suivi -> En attente de retour` flip authored by the system account.
 * The write is an atomic conditional transition (`onlyIfStatus: WAITING`),
 * mirroring the forward flip's guard against concurrent writers, and one
 * `housing:status-updated` event is written per row actually reverted. Runs
 * within the caller's transaction. Returns the count reverted.
 */
export async function revertCampaignHousingsToNeverContacted(
  campaign: Pick<CampaignApi, 'id'>,
  system: UserApi,
  today: string
): Promise<number> {
  const waiting = await housingRepository.find({
    filters: {
      campaignIds: [campaign.id],
      status: HousingStatus.WAITING
    },
    pagination: { paginate: false }
  });
  if (waiting.length === 0) {
    return 0;
  }

  const eligible = await selectUntouchedAutoFlips(
    waiting,
    campaign.id,
    system,
    today
  );
  if (eligible.length === 0) {
    return 0;
  }

  const reverted = await housingRepository.updateMany(
    eligible.map<HousingId>((housing) => ({
      geoCode: housing.geoCode,
      id: housing.id
    })),
    { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
    { onlyIfStatus: HousingStatus.WAITING }
  );
  if (reverted.length === 0) {
    return 0;
  }

  const now = new Date().toJSON();
  const events = reverted.map<HousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    createdAt: now,
    createdBy: system.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  }));
  await eventRepository.insertManyHousingEvents(events);

  return reverted.length;
}

/**
 * Filter `waiting` to the housings eligible for the postpone revert. Enrichment
 * reads run on the ambient transaction so they see the campaign's just-saved
 * future `sentAt`. `currentCampaignId` is excluded from the sibling-sent check —
 * it is future by construction, and reading its freshly-saved value is
 * unnecessary.
 */
async function selectUntouchedAutoFlips(
  waiting: ReadonlyArray<HousingApi>,
  currentCampaignId: string,
  system: UserApi,
  today: string
): Promise<ReadonlyArray<HousingApi>> {
  return withinTransaction(async (transaction) => {
    const siblingIds = [
      ...new Set(
        waiting
          .flatMap((housing) => housing.campaignIds ?? [])
          .filter((id) => id !== currentCampaignId)
      )
    ];
    const sentAtById = new Map<string, string | null>();
    for (const chunk of chunksOf(siblingIds, 1000)) {
      const rows = await Campaigns(transaction)
        .whereIn('id', chunk)
        .select('id', 'sent_at');
      for (const row of rows) {
        sentAtById.set(
          row.id,
          row.sent_at ? new Date(row.sent_at).toJSON().slice(0, 10) : null
        );
      }
    }

    const pairs = waiting.map(
      (housing) => [housing.geoCode, housing.id] as [string, string]
    );
    const latestEventByHousing = new Map<
      string,
      {
        nextOld: { status?: string } | null;
        nextNew: { status?: string } | null;
        createdBy: string;
      }
    >();
    for (const chunk of chunksOf(pairs, 1000)) {
      const rows = await HousingEvents(transaction)
        .join(
          EVENTS_TABLE,
          `${EVENTS_TABLE}.id`,
          `${HOUSING_EVENTS_TABLE}.event_id`
        )
        .where(`${EVENTS_TABLE}.type`, 'housing:status-updated')
        .whereIn(
          [
            `${HOUSING_EVENTS_TABLE}.housing_geo_code`,
            `${HOUSING_EVENTS_TABLE}.housing_id`
          ],
          chunk
        )
        .orderBy(`${EVENTS_TABLE}.created_at`, 'desc')
        .select(
          `${HOUSING_EVENTS_TABLE}.housing_geo_code as housing_geo_code`,
          `${HOUSING_EVENTS_TABLE}.housing_id as housing_id`,
          `${EVENTS_TABLE}.next_old as next_old`,
          `${EVENTS_TABLE}.next_new as next_new`,
          `${EVENTS_TABLE}.created_by as created_by`
        );
      for (const row of rows) {
        const key = `${row.housing_geo_code}:${row.housing_id}`;
        // Rows are DESC by created_at, so the first seen per housing is latest.
        if (!latestEventByHousing.has(key)) {
          latestEventByHousing.set(key, {
            nextOld: row.next_old,
            nextNew: row.next_new,
            createdBy: row.created_by
          });
        }
      }
    }

    return waiting.filter((housing) => {
      const hasSentSibling = (housing.campaignIds ?? [])
        .filter((id) => id !== currentCampaignId)
        .some((id) => isSendDateReached(sentAtById.get(id) ?? null, today));
      if (hasSentSibling) {
        return false;
      }

      const event = latestEventByHousing.get(
        `${housing.geoCode}:${housing.id}`
      );
      return (
        !!event &&
        event.nextOld?.status ===
          HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] &&
        event.nextNew?.status ===
          HOUSING_STATUS_LABELS[HousingStatus.WAITING] &&
        event.createdBy === system.id
      );
    });
  });
}
