import { Readable } from 'node:stream';

import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import type { Kysely, Transaction } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

import config from '~/infra/config';
import { fromDateDBO } from '~/infra/database';
import { runInBatches } from '~/infra/database/batch';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { isSendDateReached } from '~/models/CampaignApi';
import type { CampaignApi } from '~/models/CampaignApi';
import type {
  CampaignHousingEventApi,
  HousingEventApi
} from '~/models/EventApi';
import type { HousingApi } from '~/models/HousingApi';
import { findLatestStatusUpdatedEvents } from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';
import { today } from '~/utils/date';

import { rows } from './lib/row-stream';
import type { RowStream } from './lib/row-stream';
import type { PlanRow, Repair } from './lib/types';

/**
 * How long (ms) after a `housing:campaign-attached` event its paired
 * `housing:status-updated` flip may land and still count as the same
 * createFromGroup call. In createFromGroup the attachment events are timestamped
 * up front (before the transaction opens) and the flip is written later, inside
 * the transaction, after the campaign/sender/draft/link writes — so a genuine
 * pair always has the attachment *at or before* the flip, a small bounded gap
 * apart. The correlation is therefore directional (see `decide`): an attachment
 * that lands *after* the flip is not the old bug and must not be reverted.
 * Calibrate against production before applying (see the plan's rollout task) and
 * raise this above the observed maximum with real margin.
 */
export const ATTACHMENT_CORRELATION_TOLERANCE_MS = 10_000;

export interface HousingWithContext extends HousingApi {
  today: string;
  systemId: string | null;
  campaigns: Pick<CampaignApi, 'id' | 'sentAt'>[];
  lastStatusUpdatedEvent: HousingEventApi | null;
  campaignAttachedEvents: CampaignHousingEventApi[];
}

function key(housing: Pick<HousingApi, 'id' | 'geoCode'>): string {
  return `${housing.geoCode}:${housing.id}`;
}

/**
 * The `campaignsHousing ⋈ campaigns` sentAt lookup for one chunk of housings,
 * shared between `buildCandidates` (plan time, no lock) and `revalidate`
 * (apply time, `forUpdate: true` — the lock is what closes the plan-to-apply
 * drift window, held until apply()'s transaction commits). One query
 * definition keeps the two from silently diverging.
 */
async function queryCampaignSentAtByHousing(
  executor: Kysely<DB> | Transaction<DB>,
  chunk: ReadonlyArray<[geoCode: string, id: string]>,
  options: { forUpdate?: boolean } = {}
): Promise<
  Array<{
    housingGeoCode: string;
    housingId: string;
    campaignId: string;
    sentAt: Date | null;
  }>
> {
  const query = executor
    .selectFrom('campaignsHousing')
    .innerJoin('campaigns', 'campaigns.id', 'campaignsHousing.campaignId')
    .where((eb) =>
      eb(
        eb.refTuple(
          'campaignsHousing.housingGeoCode',
          'campaignsHousing.housingId'
        ),
        'in',
        chunk.map(([geoCode, id]) => eb.tuple(geoCode, id))
      )
    )
    .select([
      'campaignsHousing.housingGeoCode as housingGeoCode',
      'campaignsHousing.housingId as housingId',
      'campaigns.id as campaignId',
      'campaigns.sentAt as sentAt'
    ]);
  return options.forUpdate ? query.forUpdate().execute() : query.execute();
}

export const campaignSendingDateRepair: Repair<HousingWithContext> = {
  name: 'campaign-sending-date',
  // Reverts `status` (a count-trigger-watched column) over potentially many
  // rows; disable the counts triggers and recompute once.
  bypassTriggers: true,

  // Bulk-enrich the bounded candidate set once, then stream it. `rows<H>()`
  // brands the Readable so `plan()` consumes it type-safely. `buildCandidates`
  // is a hoisted declaration, so calling it above its definition is fine.
  query(): RowStream<HousingWithContext> {
    const output = new Readable({ objectMode: true, read() {} });
    buildCandidates().then(
      (candidates) => {
        candidates.forEach((candidate) => output.push(candidate));
        output.push(null);
      },
      (error) =>
        output.destroy(
          error instanceof Error ? error : new Error(String(error))
        )
    );
    return rows<HousingWithContext>(output);

    async function buildCandidates(): Promise<HousingWithContext[]> {
      const now = today();
      const system = await userRepository.getByEmail(config.app.system);
      const systemId = system?.id ?? null;

      const waiting = (
        await housingRepository.find({
          filters: { status: HousingStatus.WAITING },
          pagination: { paginate: false }
        })
      ).filter((housing) => housing.subStatus === null);

      if (waiting.length === 0) {
        return [];
      }

      const pairs = waiting.map(
        (housing) => [housing.geoCode, housing.id] as [string, string]
      );

      const campaignsByHousing = new Map<
        string,
        Pick<CampaignApi, 'id' | 'sentAt'>[]
      >();
      const statusEventByHousing = new Map<string, HousingEventApi>();
      const attachedByHousing = new Map<string, CampaignHousingEventApi[]>();

      await runInBatches(pairs, async (chunk) => {
        const [campaignRows, statusEvents, attachedRows] = await Promise.all([
          queryCampaignSentAtByHousing(kysely, chunk),
          findLatestStatusUpdatedEvents(kysely, chunk),
          kysely
            .selectFrom('campaignHousingEvents')
            .innerJoin('events', 'events.id', 'campaignHousingEvents.eventId')
            .where('events.type', '=', 'housing:campaign-attached')
            .where((eb) =>
              eb(
                eb.refTuple(
                  'campaignHousingEvents.housingGeoCode',
                  'campaignHousingEvents.housingId'
                ),
                'in',
                chunk.map(([geoCode, id]) => eb.tuple(geoCode, id))
              )
            )
            .select([
              'campaignHousingEvents.housingGeoCode as housingGeoCode',
              'campaignHousingEvents.housingId as housingId',
              'campaignHousingEvents.campaignId as campaignId',
              'events.id as id',
              'events.nextNew as nextNew',
              'events.createdAt as createdAt',
              'events.createdBy as createdBy'
            ])
            .execute()
        ]);

        for (const row of campaignRows) {
          const k = `${row.housingGeoCode}:${row.housingId}`;
          const list = campaignsByHousing.get(k) ?? [];
          list.push({
            id: row.campaignId,
            sentAt: row.sentAt ? fromDateDBO(row.sentAt).slice(0, 10) : null
          });
          campaignsByHousing.set(k, list);
        }

        for (const [geoCode, id] of chunk) {
          const k = `${geoCode}:${id}`;
          const event = statusEvents.get(k);
          if (event) {
            statusEventByHousing.set(k, {
              id: event.id,
              type: 'housing:status-updated',
              nextOld: event.nextOld,
              nextNew: event.nextNew,
              createdAt: fromDateDBO(event.createdAt),
              createdBy: event.createdBy,
              housingGeoCode: geoCode,
              housingId: id
            } as HousingEventApi);
          }
        }

        for (const row of attachedRows) {
          const k = `${row.housingGeoCode}:${row.housingId}`;
          const list = attachedByHousing.get(k) ?? [];
          list.push({
            id: row.id,
            type: 'housing:campaign-attached',
            nextOld: null,
            nextNew: row.nextNew,
            createdAt: fromDateDBO(row.createdAt),
            createdBy: row.createdBy,
            housingGeoCode: row.housingGeoCode,
            housingId: row.housingId,
            campaignId: row.campaignId
          } as CampaignHousingEventApi);
          attachedByHousing.set(k, list);
        }
      });

      return waiting.map((housing) => {
        const k = key(housing);
        return {
          ...housing,
          today: now,
          systemId,
          campaigns: campaignsByHousing.get(k) ?? [],
          lastStatusUpdatedEvent: statusEventByHousing.get(k) ?? null,
          campaignAttachedEvents: attachedByHousing.get(k) ?? []
        };
      });
    }
  },

  decide(housing) {
    // The latest status-updated event must be the pristine
    // "Non suivi" -> "En attente de retour" auto-flip shape.
    const event = housing.lastStatusUpdatedEvent;
    if (!event || event.type !== 'housing:status-updated') {
      return { action: 'skip' };
    }
    const { nextOld, nextNew } = event;
    if (
      nextOld?.status !==
        HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] ||
      nextNew?.status !== HOUSING_STATUS_LABELS[HousingStatus.WAITING]
    ) {
      return { action: 'skip' };
    }

    // Attributable to a campaign attachment: a campaign-attached event for this
    // housing precedes the status event by no more than the tolerance window.
    // The check is directional — `attached <= status` — because createFromGroup
    // always writes the attachment before the flip. A `Math.abs` window would
    // also accept the reverse order (a manual flip followed by an attachment
    // seconds later), misreading it as the old bug and reverting it.
    const statusTime = new Date(event.createdAt).getTime();
    const correlated = housing.campaignAttachedEvents.some((attached) => {
      const gap = statusTime - new Date(attached.createdAt).getTime();
      return gap >= 0 && gap <= ATTACHMENT_CORRELATION_TOLERANCE_MS;
    });
    if (!correlated) {
      return { action: 'skip' };
    }

    const hasSentCampaign = housing.campaigns.some((campaign) =>
      isSendDateReached(campaign.sentAt, housing.today)
    );

    if (hasSentCampaign) {
      // The housing legitimately stays WAITING because a campaign genuinely
      // sent. Only re-author the flip event from the user to the system account
      // (delete-old + create-replacement, new id, same createdAt) so the live
      // postpone-revert rule can later recognise and revert it. Skip if the
      // system account is unavailable or the event is already system-authored
      // (idempotent).
      if (housing.systemId === null || event.createdBy === housing.systemId) {
        return { action: 'skip' };
      }
      return {
        // Only act if the housing is still the untouched WAITING auto-flip at
        // apply time; if a caseworker or the cron moved it since planning, skip
        // the re-author rather than resurrect a stale event.
        expect: { status: HousingStatus.WAITING, subStatus: null },
        deleteEventIds: [event.id],
        createEvents: [{ ...event, id: uuidv4(), createdBy: housing.systemId }]
      };
    }

    // No campaign has sent: the housing was flipped early and should be
    // reverted to NEVER_CONTACTED; the erroneous event is hard-deleted. Guard
    // the destructive revert on the housing still being the untouched WAITING
    // auto-flip at apply time, so a manual edit made between plan and apply is
    // not clobbered.
    return {
      expect: { status: HousingStatus.WAITING, subStatus: null },
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
      deleteEventIds: [event.id]
    };
  },

  // The generic `expect` (status/subStatus) can't express "no sibling campaign
  // has since reached its sending date" — the full-revert branch's real
  // precondition, and the re-author branch's exact opposite ("some sibling
  // still has"). Between `plan` and the manually-run `apply`, the mere passage
  // of time — or a caseworker postponing a campaign — can flip either
  // precondition, which would make the planned action wrong (see `decide`'s
  // two branches). Re-derive `hasSentCampaign` live for every row and check it
  // against whichever precondition that row's branch requires. Runs inside
  // apply()'s own transaction and takes the `campaigns` rows under a row lock
  // (`forUpdate`), so the lock persists until that transaction commits and no
  // concurrent sentAt change to those exact campaigns can land in between —
  // the same guarantee the generic `expect` re-check gives `fast_housing`.
  async revalidate(
    planRows: PlanRow[],
    trx: Transaction<DB>
  ): Promise<Set<string>> {
    const stale = new Set<string>();
    if (planRows.length === 0) {
      return stale;
    }

    const now = today();
    const hasSentCampaign = new Set<string>();
    const pairs = planRows.map(
      (row) => [row.housingGeoCode, row.housingId] as [string, string]
    );
    await runInBatches(pairs, async (chunk) => {
      const campaignRows = await queryCampaignSentAtByHousing(trx, chunk, {
        forUpdate: true
      });
      for (const row of campaignRows) {
        const sentAt = row.sentAt ? fromDateDBO(row.sentAt).slice(0, 10) : null;
        if (isSendDateReached(sentAt, now)) {
          hasSentCampaign.add(`${row.housingGeoCode}:${row.housingId}`);
        }
      }
    });

    for (const row of planRows) {
      const k = `${row.housingGeoCode}:${row.housingId}`;
      const sent = hasSentCampaign.has(k);
      // Full-revert rows (`update` set) expect no sibling to have sent;
      // re-author rows expect the opposite.
      if (row.update !== undefined ? sent : !sent) {
        stale.add(k);
      }
    }

    return stale;
  }
};
