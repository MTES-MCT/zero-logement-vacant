import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '../../server';
import { DraftApi } from '../../models/DraftApi';
import { genCampaignApi, genDraftApi } from '../../test/testFixtures';
import { tokenProvider } from '../../test/testUtils';
import { CampaignApi } from '../../models/CampaignApi';
import { Establishment1 } from '../../../database/seeds/test/001-establishments';
import { User1 } from '../../../database/seeds/test/003-users';
import { Drafts, formatDraftApi } from '../../repositories/draftRepository';
import {
  Campaigns,
  formatCampaignApi,
} from '../../repositories/campaignRepository';
import { CampaignsDrafts } from '../../repositories/campaignDraftRepository';

describe('Draft API', () => {
  const { app } = createServer();

  describe('GET /drafts', () => {
    const testRoute = '/api/drafts';
    const drafts: DraftApi[] = Array.from({ length: 4 }).map(() =>
      genDraftApi(Establishment1)
    );

    beforeEach(async () => {
      await Drafts().insert(drafts.map(formatDraftApi));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute);
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list drafts', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider());

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(drafts.length);
    });

    it('should list drafts by campaign', async () => {
      const [firstDraft] = drafts;
      const campaign: CampaignApi = genCampaignApi(Establishment1.id, User1.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsDrafts().insert({
        campaign_id: campaign.id,
        draft_id: firstDraft.id,
      });

      const { body, status } = await request(app)
        .get(testRoute)
        .query(`campaign=${campaign.id}`)
        .use(tokenProvider());

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(1);
      expect(body).toContainEqual(firstDraft);
    });
  });
});
