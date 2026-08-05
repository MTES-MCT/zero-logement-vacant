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
const fixtureUser = genUserApi('establishment-id');

function statusEvent(
  overrides: Partial<HousingEventApi> = {}
): HousingEventApi {
  return {
    ...genEventApi({
      type: 'housing:status-updated',
      creator: fixtureUser,
      nextOld: {
        status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
      },
      nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] }
    }),
    id: 'status-event-id',
    createdAt: STATUS_EVENT_TIME,
    housingGeoCode: '01001',
    housingId: 'housing-id',
    ...overrides
  } as HousingEventApi;
}

function attachedEvent(createdAt: string): CampaignHousingEventApi {
  return {
    ...genEventApi({
      type: 'housing:campaign-attached',
      creator: fixtureUser,
      nextOld: null,
      nextNew: { name: 'Campaign' }
    }),
    id: 'attached-event-id',
    createdAt,
    housingGeoCode: '01001',
    housingId: 'housing-id',
    campaignId: 'campaign-id'
  } as CampaignHousingEventApi;
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
      expect: { status: HousingStatus.WAITING, subStatus: null },
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
    // An attachment far *before* the flip (beyond the tolerance) is not its pair.
    const farApart = new Date(
      new Date(STATUS_EVENT_TIME).getTime() -
        ATTACHMENT_CORRELATION_TOLERANCE_MS -
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

  it('skips when the attachment lands after the status flip (reverse order)', () => {
    // createFromGroup writes the attachment before the flip. A manual flip
    // followed by an attachment seconds later is the reverse order and must not
    // be mistaken for the old bug, even though it sits inside the window.
    const afterFlip = new Date(
      new Date(STATUS_EVENT_TIME).getTime() + 5_000
    ).toJSON();
    const housing = {
      ...base(),
      campaignAttachedEvents: [attachedEvent(afterFlip)]
    };
    expect(campaignSendingDateRepair.decide(housing)).toEqual({
      action: 'skip'
    });
  });

  it('correlates at exactly the tolerance boundary', () => {
    // Attachment the full tolerance *before* the flip: the boundary of a pair.
    const atBoundary = new Date(
      new Date(STATUS_EVENT_TIME).getTime() -
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
    // The attachment precedes the flip, as createFromGroup writes it.
    const flipTime = new Date('2026-01-01T10:00:00.000Z');
    await Events().insert({ ...formatEventApi(flip), created_at: flipTime });
    await Events().insert({
      ...formatEventApi(attached),
      created_at: new Date(flipTime.getTime() - 2000)
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

describe('campaignSendingDateRepair.revalidate (integration)', () => {
  it('flags a full-revert row as stale once a sibling campaign has since sent', async () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));

    const housing = {
      ...genHousingApi(),
      status: HousingStatus.WAITING,
      subStatus: null
    };
    // Not sent when the plan was generated, but has since reached its sending
    // date by the time apply() runs.
    const sibling = {
      ...genCampaignApi(establishment.id, user),
      sentAt: '2020-01-01'
    };
    await Housing().insert(formatHousingRecordApi(housing));
    await Campaigns().insert(formatCampaignApi(sibling));
    await CampaignsHousing().insert({
      campaign_id: sibling.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    const stale = await campaignSendingDateRepair.revalidate!([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
      }
    ]);

    expect(stale).toEqual(new Set([`${housing.geoCode}:${housing.id}`]));
  });

  it('does not flag a full-revert row when no campaign has sent', async () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));

    const housing = {
      ...genHousingApi(),
      status: HousingStatus.WAITING,
      subStatus: null
    };
    const draft = { ...genCampaignApi(establishment.id, user), sentAt: null };
    await Housing().insert(formatHousingRecordApi(housing));
    await Campaigns().insert(formatCampaignApi(draft));
    await CampaignsHousing().insert({
      campaign_id: draft.id,
      housing_id: housing.id,
      housing_geo_code: housing.geoCode
    });

    const stale = await campaignSendingDateRepair.revalidate!([
      {
        housingId: housing.id,
        housingGeoCode: housing.geoCode,
        update: { status: HousingStatus.NEVER_CONTACTED, subStatus: null }
      }
    ]);

    expect(stale.size).toBe(0);
  });

  it('ignores re-author rows (no `update`), whose precondition is the opposite', async () => {
    const housing = {
      ...genHousingApi(),
      status: HousingStatus.WAITING,
      subStatus: null
    };
    await Housing().insert(formatHousingRecordApi(housing));

    const stale = await campaignSendingDateRepair.revalidate!([
      { housingId: housing.id, housingGeoCode: housing.geoCode }
    ]);

    expect(stale.size).toBe(0);
  });
});
