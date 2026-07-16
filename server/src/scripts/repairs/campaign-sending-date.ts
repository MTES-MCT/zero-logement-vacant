import { Readable } from 'node:stream';

import { HOUSING_STATUS_LABELS, HousingStatus } from '@zerologementvacant/models';
import { chunksOf } from 'effect/Array';

import { isSendDateReached } from '~/models/CampaignApi';
import type { CampaignApi } from '~/models/CampaignApi';
import type { CampaignHousingEventApi, HousingEventApi } from '~/models/EventApi';
import type { HousingApi } from '~/models/HousingApi';
import {
  campaignsHousingTable,
  CampaignsHousing
} from '~/repositories/campaignHousingRepository';
import { campaignsTable } from '~/repositories/campaignRepository';
import {
  CAMPAIGN_HOUSING_EVENTS_TABLE,
  CampaignHousingEvents,
  EVENTS_TABLE,
  HOUSING_EVENTS_TABLE,
  HousingEvents
} from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import { today } from '~/utils/date';
import { rows } from './lib/row-stream';
import type { RowStream } from './lib/row-stream';
import type { Repair } from './lib/types';

/**
 * How far apart (ms) a `housing:campaign-attached` event may sit from its paired
 * `housing:status-updated` event and still count as the same createFromGroup
 * call. createFromGroup builds the two event lists in back-to-back synchronous
 * `.map()` passes with no I/O between them, so genuine pairs are milliseconds
 * apart. Calibrate against production before applying (see the plan's rollout
 * task) and raise this above the observed maximum with real margin.
 */
export const ATTACHMENT_CORRELATION_TOLERANCE_MS = 10_000;

export interface HousingWithContext extends HousingApi {
  today: string;
  campaigns: Pick<CampaignApi, 'id' | 'sentAt'>[];
  lastStatusUpdatedEvent: HousingEventApi | null;
  campaignAttachedEvents: CampaignHousingEventApi[];
}

function key(housing: Pick<HousingApi, 'id' | 'geoCode'>): string {
  return `${housing.geoCode}:${housing.id}`;
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
        output.destroy(error instanceof Error ? error : new Error(String(error)))
    );
    return rows<HousingWithContext>(output);

    async function buildCandidates(): Promise<HousingWithContext[]> {
      const now = today();

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

      for (const chunk of chunksOf(pairs, 1000)) {
        const campaignRows = await CampaignsHousing()
          .join(
            campaignsTable,
            `${campaignsTable}.id`,
            `${campaignsHousingTable}.campaign_id`
          )
          .whereIn(
            [
              `${campaignsHousingTable}.housing_geo_code`,
              `${campaignsHousingTable}.housing_id`
            ],
            chunk
          )
          .select(
            `${campaignsHousingTable}.housing_geo_code as housing_geo_code`,
            `${campaignsHousingTable}.housing_id as housing_id`,
            `${campaignsTable}.id as campaign_id`,
            `${campaignsTable}.sent_at as sent_at`
          );
        for (const row of campaignRows) {
          const k = `${row.housing_geo_code}:${row.housing_id}`;
          const list = campaignsByHousing.get(k) ?? [];
          list.push({
            id: row.campaign_id,
            sentAt: row.sent_at ? new Date(row.sent_at).toJSON().slice(0, 10) : null
          });
          campaignsByHousing.set(k, list);
        }

        const statusRows = await HousingEvents()
          .join(EVENTS_TABLE, `${EVENTS_TABLE}.id`, `${HOUSING_EVENTS_TABLE}.event_id`)
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
            `${EVENTS_TABLE}.id as id`,
            `${EVENTS_TABLE}.next_old as next_old`,
            `${EVENTS_TABLE}.next_new as next_new`,
            `${EVENTS_TABLE}.created_at as created_at`,
            `${EVENTS_TABLE}.created_by as created_by`
          );
        for (const row of statusRows) {
          const k = `${row.housing_geo_code}:${row.housing_id}`;
          // Rows are DESC by created_at, so the first seen per housing is latest.
          if (!statusEventByHousing.has(k)) {
            statusEventByHousing.set(k, {
              id: row.id,
              type: 'housing:status-updated',
              nextOld: row.next_old,
              nextNew: row.next_new,
              createdAt: new Date(row.created_at).toJSON(),
              createdBy: row.created_by,
              housingGeoCode: row.housing_geo_code,
              housingId: row.housing_id
            });
          }
        }

        const attachedRows = await CampaignHousingEvents()
          .join(
            EVENTS_TABLE,
            `${EVENTS_TABLE}.id`,
            `${CAMPAIGN_HOUSING_EVENTS_TABLE}.event_id`
          )
          .where(`${EVENTS_TABLE}.type`, 'housing:campaign-attached')
          .whereIn(
            [
              `${CAMPAIGN_HOUSING_EVENTS_TABLE}.housing_geo_code`,
              `${CAMPAIGN_HOUSING_EVENTS_TABLE}.housing_id`
            ],
            chunk
          )
          .select(
            `${CAMPAIGN_HOUSING_EVENTS_TABLE}.housing_geo_code as housing_geo_code`,
            `${CAMPAIGN_HOUSING_EVENTS_TABLE}.housing_id as housing_id`,
            `${CAMPAIGN_HOUSING_EVENTS_TABLE}.campaign_id as campaign_id`,
            `${EVENTS_TABLE}.id as id`,
            `${EVENTS_TABLE}.next_new as next_new`,
            `${EVENTS_TABLE}.created_at as created_at`,
            `${EVENTS_TABLE}.created_by as created_by`
          );
        for (const row of attachedRows) {
          const k = `${row.housing_geo_code}:${row.housing_id}`;
          const list = attachedByHousing.get(k) ?? [];
          list.push({
            id: row.id,
            type: 'housing:campaign-attached',
            nextOld: null,
            nextNew: row.next_new,
            createdAt: new Date(row.created_at).toJSON(),
            createdBy: row.created_by,
            housingGeoCode: row.housing_geo_code,
            housingId: row.housing_id,
            campaignId: row.campaign_id
          });
          attachedByHousing.set(k, list);
        }
      }

      return waiting.map((housing) => {
        const k = key(housing);
        return {
          ...housing,
          today: now,
          campaigns: campaignsByHousing.get(k) ?? [],
          lastStatusUpdatedEvent: statusEventByHousing.get(k) ?? null,
          campaignAttachedEvents: attachedByHousing.get(k) ?? []
        };
      });
    }
  },

  decide(housing) {
    // 1. No sent campaign: if any attached campaign has already sent, the
    //    housing is legitimately WAITING because of it — leave it.
    const hasSentCampaign = housing.campaigns.some((campaign) =>
      isSendDateReached(campaign.sentAt, housing.today)
    );
    if (hasSentCampaign) {
      return { action: 'skip' };
    }

    // 2. Untouched since the auto-flip: the latest status-updated event must be
    //    the pristine "Non suivi" -> "En attente de retour" shape.
    const event = housing.lastStatusUpdatedEvent;
    if (!event || event.type !== 'housing:status-updated') {
      return { action: 'skip' };
    }
    const { nextOld, nextNew } = event;
    if (
      nextOld?.status !== HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] ||
      nextNew?.status !== HOUSING_STATUS_LABELS[HousingStatus.WAITING]
    ) {
      return { action: 'skip' };
    }

    // 3. Attributable to a campaign attachment: a campaign-attached event for
    //    this housing sits within the tolerance window of the status event.
    const statusTime = new Date(event.createdAt).getTime();
    const correlated = housing.campaignAttachedEvents.some(
      (attached) =>
        Math.abs(new Date(attached.createdAt).getTime() - statusTime) <=
        ATTACHMENT_CORRELATION_TOLERANCE_MS
    );
    if (!correlated) {
      return { action: 'skip' };
    }

    return {
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
      deleteEventIds: [event.id]
    };
  }
};
