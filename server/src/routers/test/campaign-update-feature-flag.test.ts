import { constants } from 'node:http2';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createServer } from '~/infra/server';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genUserApi
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Campaign update feature flag routing', () => {
  let url: string;
  let establishmentId: string;
  let userId: string;
  let campaignId: string;

  beforeAll(async () => {
    url = await createServer().testing();

    const establishment = genEstablishmentApi();
    establishmentId = establishment.id;
    await Establishments().insert(formatEstablishmentApi(establishment));

    const user = genUserApi(establishmentId);
    userId = user.id;
    await Users().insert(formatUserApi(user));

    const campaign = genCampaignApi(establishmentId, userId);
    campaignId = campaign.id;
    await Campaigns().insert(formatCampaignApi(campaign));
  });

  afterEach(() => {
    delete process.env.FEATURE_IS_NEW_CAMPAIGN_UPDATE_FLOW;
  });

  it('should use old update flow when flag is not set', async () => {
    const { status } = await request(url)
      .put(`/api/campaigns/${campaignId}`)
      .send({
        title: 'Updated Title',
        status: 'draft',
        description: 'Updated description'
      })
      .use(tokenProvider({ id: userId, establishmentId } as any));

    // Old flow returns 200 OK
    expect(status).toBe(constants.HTTP_STATUS_OK);
  });

  it('should use old update flow when flag is false', async () => {
    process.env.FEATURE_IS_NEW_CAMPAIGN_UPDATE_FLOW = 'false';

    const { status } = await request(url)
      .put(`/api/campaigns/${campaignId}`)
      .send({
        title: 'Updated Title',
        status: 'draft',
        description: 'Updated description'
      })
      .use(tokenProvider({ id: userId, establishmentId } as any));

    expect(status).toBe(constants.HTTP_STATUS_OK);
  });

  it('should use new update flow when flag is true', async () => {
    process.env.FEATURE_IS_NEW_CAMPAIGN_UPDATE_FLOW = 'true';

    const { status, body } = await request(url)
      .put(`/api/campaigns/${campaignId}`)
      .send({
        title: 'Updated Title',
        status: 'draft',
        description: 'Updated description'
      })
      .use(tokenProvider({ id: userId, establishmentId } as any));

    // New flow returns 501 Not Implemented
    expect(status).toBe(constants.HTTP_STATUS_NOT_IMPLEMENTED);
    expect(body).toHaveProperty('message');
  });
});
