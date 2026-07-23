import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { describe, expect, it } from 'vitest';

import config from '~/infra/config';
import type {
  CampaignHousingEventApi,
  HousingEventApi
} from '~/models/EventApi';
import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  CampaignHousingEvents,
  Events,
  formatEventApi,
  HousingEvents
} from '~/repositories/eventRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import userRepository, {
  toUserDBO,
  Users
} from '~/repositories/userRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genEventApi,
  genHousingApi,
  genUserApi
} from '~/test/testFixtures';

import {
  ATTACHMENT_CORRELATION_TOLERANCE_MS,
  campaignSendingDateRepair,
  type HousingWithContext
} from '../campaign-sending-date';

const TODAY = '2026-07-15';
const STATUS_EVENT_TIME = '2026-01-01T10:00:00.000Z';

function statusEvent(
  overrides: Partial<HousingEventApi> = {}
): HousingEventApi {
  return {
    id: 'status-event-id',
    type: 'housing:status-updated',
    nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
    nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
    createdAt: STATUS_EVENT_TIME,
    createdBy: 'user-id',
    housingGeoCode: '01001',
    housingId: 'housing-id',
    ...overrides
  } as HousingEventApi;
}

function attachedEvent(createdAt: string): CampaignHousingEventApi {
  return {
    id: 'attached-event-id',
    type: 'housing:campaign-attached',
    nextOld: null,
    nextNew: { name: 'Campaign' },
    createdAt,
    createdBy: 'user-id',
    housingGeoCode: '01001',
    housingId: 'housing-id',
    campaignId: 'campaign-id'
  };
}

function base() {
  return {
    ...genHousingApi(),
    status: HousingStatus.WAITING,
    subStatus: null,
    today: TODAY,
    systemId: 'system-id',
    campaigns: [{ id: 'campaign-id', sentAt: null }],
    lastStatusUpdatedEvent: statusEvent(),
    campaignAttachedEvents: [attachedEvent(STATUS_EVENT_TIME)]
  };
}

describe('campaignSendingDateRepair.decide', () => {
  it('reverts a housing flipped early by an unsent campaign', () => {
    expect(campaignSendingDateRepair.decide(base())).toEqual({
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null },
      deleteEventIds: ['status-event-id']
    });
  });

  it('re-authors a human-authored flip when a campaign has already sent', () => {
    const housing = {
      ...base(),
      campaigns: [{ id: 'c', sentAt: '2020-01-01' }]
    };
    const decision = campaignSendingDateRepair.decide(housing);
    expect(decision).toMatchObject({ deleteEventIds: ['status-event-id'] });
    const action = decision as {
      createEvents: HousingEventApi[];
      update?: unknown;
    };
    expect(action.update).toBeUndefined();
    expect(action.createEvents).toHaveLength(1);
    expect(action.createEvents[0].createdBy).toBe('system-id');
    expect(action.createEvents[0].id).not.toBe('status-event-id');
    // createdAt is preserved from the original flip.
    expect(action.createEvents[0].createdAt).toBe(STATUS_EVENT_TIME);
  });

  it('skips a sent-campaign flip already authored by the system', () => {
    const housing = {
      ...base(),
      campaigns: [{ id: 'c', sentAt: '2020-01-01' }],
      lastStatusUpdatedEvent: statusEvent({ createdBy: 'system-id' })
    };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('skips re-authoring when the system account is unavailable', () => {
    const housing = {
      ...base(),
      systemId: null,
      campaigns: [{ id: 'c', sentAt: '2020-01-01' }]
    };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('skips when there is no status-updated event', () => {
    const housing = { ...base(), lastStatusUpdatedEvent: null };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('skips when the status event is not the pristine flip shape', () => {
    const housing = {
      ...base(),
      lastStatusUpdatedEvent: statusEvent({
        nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
        nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.FIRST_CONTACT] }
      })
    };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('skips when no campaign-attached event correlates in time', () => {
    const farApart = new Date(
      new Date(STATUS_EVENT_TIME).getTime() +
        ATTACHMENT_CORRELATION_TOLERANCE_MS +
        1
    ).toJSON();
    const housing = {
      ...base(),
      campaignAttachedEvents: [attachedEvent(farApart)]
    };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('correlates at exactly the tolerance boundary', () => {
    const atBoundary = new Date(
      new Date(STATUS_EVENT_TIME).getTime() +
        ATTACHMENT_CORRELATION_TOLERANCE_MS
    ).toJSON();
    const housing = {
      ...base(),
      campaignAttachedEvents: [attachedEvent(atBoundary)]
    };
    expect(campaignSendingDateRepair.decide(housing)).toMatchObject({
      update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
    });
  });
});

describe('campaignSendingDateRepair.query (integration)', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  it('enriches an early-flipped WAITING housing so decide reverts it', async () => {
    const system = (await userRepository.getByEmail(config.app.system))!;
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));

    const housing = {
      ...genHousingApi(),
      status: HousingStatus.WAITING,
      subStatus: null
    };
    const campaign = {
      ...genCampaignApi(establishment.id, user),
      sentAt: null
    };
    await Housing().insert(formatHousingRecordApi(housing));
    await Campaigns().insert(formatCampaignApi(campaign));
    await CampaignsHousing().insert({
      campaign_id: campaign.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    const attached = genEventApi({
      type: 'housing:campaign-attached',
      creator: user,
      nextOld: null,
      nextNew: { name: campaign.title }
    });
    const flip = genEventApi({
      type: 'housing:status-updated',
      creator: user,
      nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED] },
      nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] }
    });
    // Pin created_at so attach + flip fall within ATTACHMENT_CORRELATION_TOLERANCE_MS
    // (genEventApi uses faker.date.past(), which would otherwise place them far apart).
    const flipTime = new Date('2026-01-01T10:00:00.000Z');
    await Events().insert({ ...formatEventApi(flip), created_at: flipTime });
    await Events().insert({
      ...formatEventApi(attached),
      created_at: new Date(flipTime.getTime() + 2000)
    });
    await CampaignHousingEvents().insert({
      event_id: attached.id,
      campaign_id: campaign.id,
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });
    await HousingEvents().insert({
      event_id: flip.id,
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });

    // query() returns a RowStream (Readable); collect it, don't await an array.
    const enriched: HousingWithContext[] = [];
    await pipeline(
      campaignSendingDateRepair.query(),
      new Writable({
        objectMode: true,
        write(row: HousingWithContext, _encoding, callback) {
          enriched.push(row);
          callback();
        }
      })
    );
    const target = enriched.find((h) => h.id === housing.id);
    expect(target).toBeDefined();
    expect(target!.systemId).toBe(system.id);
    expect(target!.campaigns).toEqual([{ id: campaign.id, sentAt: null }]);
    // `nextNew` is a discriminated union keyed on `event.type`; cast to the
    // `housing:status-updated` payload shape since `lastStatusUpdatedEvent`'s
    // static type doesn't narrow from this assertion alone.
    expect(
      (
        target!.lastStatusUpdatedEvent?.nextNew as
          | { status?: string }
          | null
          | undefined
      )?.status
    ).toBe(HOUSING_STATUS_LABELS[HousingStatus.WAITING]);
    expect(target!.campaignAttachedEvents).toHaveLength(1);
    expect(campaignSendingDateRepair.decide(target!)).toMatchObject({
      deleteEventIds: [flip.id]
    });
  });
});
