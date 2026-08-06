import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';

import SystemUserMissingError from '~/errors/systemUserMissingError';
import config from '~/infra/config';
import { fromDateDBO } from '~/infra/database';
import { runInBatches } from '~/infra/database/batch';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import type { CampaignApi } from '~/models/CampaignApi';
import { isSendDateReached } from '~/models/CampaignApi';
import type { HousingEventApi } from '~/models/EventApi';
import type { HousingApi, HousingId } from '~/models/HousingApi';
import type { UserApi } from '~/models/UserApi';
import eventRepository, {
  findLatestStatusUpdatedEvents,
  type LatestStatusUpdatedEventRow
} from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';

/**
 * Resolve the system account used to attribute automated status flips.
 * Throws {@link SystemUserMissingError} if the account is missing or
 * misconfigured, so the caller (a request or the daily cron) fails loudly
 * instead of silently skipping the flip.
 */
export async function resolveSystemUser(): Promise<UserApi> {
  const system = await userRepository.getByEmail(config.app.system);
  if (!system) {
    throw new SystemUserMissingError(config.app.system);
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

  return writeStatusTransition(
    housings,
    { from: HousingStatus.NEVER_CONTACTED, to: HousingStatus.WAITING },
    system
  );
}

/**
 * Conditionally transition `housings` from `transition.from` to
 * `transition.to` (`onlyIfStatus` guards against a concurrent writer having
 * already moved a housing off `from`), writing one `housing:status-updated`
 * event per housing actually transitioned. Shared tail for the forward flip
 * and the postpone revert, which apply the same mechanics in opposite
 * directions. Returns the number transitioned.
 */
async function writeStatusTransition(
  housings: ReadonlyArray<Pick<HousingApi, 'id' | 'geoCode'>>,
  transition: { from: HousingStatus; to: HousingStatus },
  system: UserApi
): Promise<number> {
  const updated = await housingRepository.updateMany(
    housings.map<HousingId>((housing) => ({
      geoCode: housing.geoCode,
      id: housing.id
    })),
    { status: transition.to, subStatus: null },
    { onlyIfStatus: transition.from }
  );

  if (updated.length === 0) {
    return 0;
  }

  const now = new Date().toJSON();
  const events = updated.map<HousingEventApi>((housing) => ({
    id: uuidv4(),
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[transition.from] },
    nextNew: { status: HOUSING_STATUS_LABELS[transition.to] },
    createdAt: now,
    createdBy: system.id,
    housingGeoCode: housing.geoCode,
    housingId: housing.id
  }));
  await eventRepository.insertManyHousingEvents(events);

  return updated.length;
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

  return writeStatusTransition(
    eligible,
    { from: HousingStatus.WAITING, to: HousingStatus.NEVER_CONTACTED },
    system
  );
}

/**
 * Filter `waiting` to the housings eligible for the postpone revert. Enrichment
 * reads run on the ambient Kysely transaction so they see the campaign's
 * just-saved future `sentAt`. `currentCampaignId` is excluded from the
 * sibling-sent check — it is future by construction, and reading its
 * freshly-saved value is unnecessary.
 */
async function selectUntouchedAutoFlips(
  waiting: ReadonlyArray<HousingApi>,
  currentCampaignId: string,
  system: UserApi,
  today: string
): Promise<ReadonlyArray<HousingApi>> {
  return withinKyselyTransaction(async (trx) => {
    const siblingIds = [
      ...new Set(
        waiting
          .flatMap((housing) => housing.campaignIds ?? [])
          .filter((id) => id !== currentCampaignId)
      )
    ];
    const sentAtById = new Map<string, string | null>();
    await runInBatches(siblingIds, async (chunk) => {
      const rows = await trx
        .selectFrom('campaigns')
        .select(['id', 'sentAt'])
        .where('id', 'in', chunk)
        .execute();
      for (const row of rows) {
        sentAtById.set(
          row.id,
          row.sentAt ? fromDateDBO(row.sentAt).slice(0, 10) : null
        );
      }
    });

    const pairs = waiting.map(
      (housing) => [housing.geoCode, housing.id] as [string, string]
    );
    const latestEventByHousing = new Map<string, LatestStatusUpdatedEventRow>();
    await runInBatches(pairs, async (chunk) => {
      const chunkEvents = await findLatestStatusUpdatedEvents(trx, chunk);
      for (const [key, event] of chunkEvents) {
        latestEventByHousing.set(key, event);
      }
    });

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
      const nextOld = event?.nextOld as { status?: string } | null;
      const nextNew = event?.nextNew as { status?: string } | null;
      return (
        !!event &&
        nextOld?.status ===
          HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] &&
        nextNew?.status === HOUSING_STATUS_LABELS[HousingStatus.WAITING] &&
        event.createdBy === system.id
      );
    });
  });
}
