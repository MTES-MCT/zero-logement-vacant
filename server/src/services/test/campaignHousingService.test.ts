import { HousingStatus } from '@zerologementvacant/models';
import { beforeAll, describe, expect, it } from 'vitest';

import { startTransaction } from '~/infra/database/transaction';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import {
  Housing,
  formatHousingRecordApi
} from '~/repositories/housingRepository';
import { Campaigns, formatCampaignApi } from '~/repositories/campaignRepository';
import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import { Events, HOUSING_EVENTS_TABLE } from '~/repositories/eventRepository';
import {
  genEstablishmentApi,
  genUserApi,
  genHousingApi,
  genCampaignApi
} from '~/test/testFixtures';
import {
  flipCampaignHousingsToWaiting,
  flipHousingsToWaiting
} from '~/services/campaignHousingService';

describe('campaignHousingService', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
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
        flipHousingsToWaiting([housing], { createdBy: user.id })
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
    });

    it('returns 0 and writes nothing for an empty set', async () => {
      const flipped = await startTransaction(() =>
        flipHousingsToWaiting([], { createdBy: user.id })
      );
      expect(flipped).toBe(0);
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
        flipCampaignHousingsToWaiting(campaign, { createdBy: user.id })
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
        flipCampaignHousingsToWaiting(campaign, { createdBy: user.id })
      );
      const second = await startTransaction(() =>
        flipCampaignHousingsToWaiting(campaign, { createdBy: user.id })
      );
      expect(second).toBe(0);
    });
  });
});
