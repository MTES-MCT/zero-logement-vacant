import { HousingStatus } from '@zerologementvacant/models';
import { beforeAll, describe, expect, it } from 'vitest';

import { CampaignsHousing } from '~/repositories/campaignHousingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { Events } from '~/repositories/eventRepository';
import {
  Housing,
  formatHousingRecordApi
} from '~/repositories/housingRepository';
import { Users, toUserDBO } from '~/repositories/userRepository';
import {
  genEstablishmentApi,
  genUserApi,
  genHousingApi,
  genCampaignApi
} from '~/test/testFixtures';

import { flipSentCampaignHousings } from '../task';

describe('flipSentCampaignHousings', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const today = '2026-07-15';

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  async function seedCampaign(sentAt: string | null) {
    const campaign = { ...genCampaignApi(establishment.id, user), sentAt };
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
    return { campaign, housing };
  }

  it('flips housings of campaigns whose send date has passed', async () => {
    const { housing } = await seedCampaign('2020-01-01');

    const summary = await flipSentCampaignHousings({ today });

    expect(summary.housings).toBeGreaterThanOrEqual(1);
    const actual = await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .first();
    expect(actual?.status).toBe(HousingStatus.WAITING);
  });

  it('leaves future-dated campaigns untouched', async () => {
    const { housing } = await seedCampaign('2999-01-01');

    await flipSentCampaignHousings({ today });

    const actual = await Housing()
      .where({ geo_code: housing.geoCode, id: housing.id })
      .first();
    expect(actual?.status).toBe(HousingStatus.NEVER_CONTACTED);
  });

  it('is idempotent — a second run writes no new status events', async () => {
    const { housing } = await seedCampaign('2020-01-01');

    await flipSentCampaignHousings({ today });
    const eventsAfterFirst = await Events()
      .where({ type: 'housing:status-updated' })
      .whereIn('id', (q) =>
        q.select('event_id').from('housing_events').where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        })
      );

    await flipSentCampaignHousings({ today });
    const eventsAfterSecond = await Events()
      .where({ type: 'housing:status-updated' })
      .whereIn('id', (q) =>
        q.select('event_id').from('housing_events').where({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id
        })
      );

    expect(eventsAfterSecond).toHaveLength(eventsAfterFirst.length);
  });
});
