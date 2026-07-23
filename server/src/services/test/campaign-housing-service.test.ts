import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { beforeAll, describe, expect, it } from 'vitest';

import config from '~/infra/config';
import { startTransaction } from '~/infra/database/transaction';
import type { UserApi } from '~/models/UserApi';
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
  Events,
  formatEventApi,
  HOUSING_EVENTS_TABLE,
  HousingEvents
} from '~/repositories/eventRepository';
import {
  Housing,
  formatHousingRecordApi
} from '~/repositories/housingRepository';
import userRepository, {
  Users,
  toUserDBO
} from '~/repositories/userRepository';
import {
  flipCampaignHousingsToWaiting,
  flipHousingsToWaiting,
  revertCampaignHousingsToNeverContacted
} from '~/services/campaign-housing-service';
import {
  genEstablishmentApi,
  genUserApi,
  genHousingApi,
  genCampaignApi,
  genEventApi
} from '~/test/testFixtures';

describe('campaign-housing-service', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  let system: UserApi;

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
    system = (await userRepository.getByEmail(config.app.system))!;
  });

  describe('flipHousingsToWaiting', () => {
    it('sets NEVER_CONTACTED housings to WAITING and records events', async () => {
      const housing = {
        ...genHousingApi(),
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      };
      await Housing().insert(formatHousingRecordApi(housing));

      const flipped = await startTransaction(() =>
        flipHousingsToWaiting([housing], system)
      );

      expect(flipped).toBe(1);
      const actual = await Housing()
        .where({ geo_code: housing.geoCode, id: housing.id })
        .first();
      expect(actual?.status).toBe(HousingStatus.WAITING);
      expect(actual?.sub_status).toBeNull();

      const events = await Events()
        .where({ type: 'housing:status-updated' })
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        });
      expect(events).toHaveLength(1);
      // The automated flip is attributed to the system account, not the caller.
      expect(events[0].created_by).toBe(system.id);
    });

    it('returns 0 and writes nothing for an empty set', async () => {
      const flipped = await startTransaction(() =>
        flipHousingsToWaiting([], system)
      );
      expect(flipped).toBe(0);
    });

    it('does not flip or write an event for a housing no longer NEVER_CONTACTED (guards concurrent writers)', async () => {
      // The DB row is already WAITING — e.g. a concurrent writer flipped it
      // after the caller read its snapshot as NEVER_CONTACTED.
      const housing = {
        ...genHousingApi(),
        status: HousingStatus.WAITING,
        subStatus: null
      };
      await Housing().insert(formatHousingRecordApi(housing));

      const flipped = await startTransaction(() =>
        flipHousingsToWaiting([housing], system)
      );

      expect(flipped).toBe(0);
      const actual = await Housing()
        .where({ geo_code: housing.geoCode, id: housing.id })
        .first();
      expect(actual?.status).toBe(HousingStatus.WAITING);

      const events = await Events()
        .where({ type: 'housing:status-updated' })
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        });
      expect(events).toHaveLength(0);
    });
  });

  describe('flipCampaignHousingsToWaiting', () => {
    it('flips only the campaign NEVER_CONTACTED housings', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      const neverContacted = {
        ...genHousingApi(),
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      };
      const alreadyWaiting = {
        ...genHousingApi(),
        status: HousingStatus.WAITING,
        subStatus: null
      };
      await Housing().insert(
        [neverContacted, alreadyWaiting].map(formatHousingRecordApi)
      );
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsHousing().insert(
        [neverContacted, alreadyWaiting].map((housing) => ({
          campaign_id: campaign.id,
          housing_id: housing.id,
          housing_geo_code: housing.geoCode
        }))
      );

      const flipped = await startTransaction(() =>
        flipCampaignHousingsToWaiting(campaign, system)
      );

      expect(flipped).toBe(1);
      const actual = await Housing()
        .where({ geo_code: neverContacted.geoCode, id: neverContacted.id })
        .first();
      expect(actual?.status).toBe(HousingStatus.WAITING);
    });

    it('is idempotent — a second run flips nothing', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      const housing = {
        ...genHousingApi(),
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      };
      await Housing().insert(formatHousingRecordApi(housing));
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      await startTransaction(() =>
        flipCampaignHousingsToWaiting(campaign, system)
      );
      const second = await startTransaction(() =>
        flipCampaignHousingsToWaiting(campaign, system)
      );
      expect(second).toBe(0);
    });
  });

  describe('revertCampaignHousingsToNeverContacted', () => {
    const TODAY = '2026-07-15';

    // Attach `housing` to `campaign`, mark it WAITING, and give it a pristine
    // auto-flip status event authored by `author` (defaults to the system).
    async function setupWaitingHousing(
      campaign: ReturnType<typeof genCampaignApi>,
      author: UserApi = system,
      flipOverrides: Partial<{
        nextOld: { status: string };
        nextNew: { status: string };
      }> = {}
    ) {
      const housing = {
        ...genHousingApi(),
        status: HousingStatus.WAITING,
        subStatus: null
      };
      await Housing().insert(formatHousingRecordApi(housing));
      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });
      const flip = genEventApi({
        type: 'housing:status-updated',
        creator: author,
        nextOld: {
          status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
        },
        nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
        ...flipOverrides
      });
      await Events().insert(formatEventApi(flip));
      await HousingEvents().insert({
        event_id: flip.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });
      return housing;
    }

    async function statusOf(housing: { geoCode: string; id: string }) {
      const row = await Housing()
        .where({ geo_code: housing.geoCode, id: housing.id })
        .first();
      return row?.status;
    }

    async function revertEventsFor(housing: { geoCode: string; id: string }) {
      return Events()
        .where({ type: 'housing:status-updated' })
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({ housing_geo_code: housing.geoCode, housing_id: housing.id })
        .andWhere('created_by', system.id)
        .andWhereRaw(`next_new ->> 'status' = ?`, [
          HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
        ]);
    }

    it('reverts a pristine system-flipped housing and writes one reverse event', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
      const housing = await setupWaitingHousing(campaign);

      const count = await startTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(1);
      expect(await statusOf(housing)).toBe(HousingStatus.NEVER_CONTACTED);
      expect(await revertEventsFor(housing)).toHaveLength(1);
    });

    it('skips when a sibling campaign has genuinely sent', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      const sentSibling = {
        ...genCampaignApi(establishment.id, user),
        sentAt: '2020-01-01'
      };
      await Campaigns().insert([campaign, sentSibling].map(formatCampaignApi));
      const housing = await setupWaitingHousing(campaign);
      // Also attach the housing to the already-sent sibling.
      await CampaignsHousing().insert({
        campaign_id: sentSibling.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const count = await startTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });

    it('skips when the latest status event is not the pristine flip shape', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
      const housing = await setupWaitingHousing(campaign, system, {
        nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
        nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.IN_PROGRESS] }
      });

      const count = await startTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });

    it('skips when the pristine flip was authored by a user, not the system', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
      const housing = await setupWaitingHousing(campaign, user);

      const count = await startTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });

    it('skips a WAITING housing with no status-updated event', async () => {
      const campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
      const housing = {
        ...genHousingApi(),
        status: HousingStatus.WAITING,
        subStatus: null
      };
      await Housing().insert(formatHousingRecordApi(housing));
      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_id: housing.id,
        housing_geo_code: housing.geoCode
      });

      const count = await startTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });
  });
});
