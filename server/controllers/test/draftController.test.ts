import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '../../server';
import { DraftApi } from '../../models/DraftApi';
import { genCampaignApi, genDraftApi } from '../../test/testFixtures';
import { tokenProvider } from '../../test/testUtils';
import { CampaignApi } from '../../models/CampaignApi';
import {
  Establishment1,
  Establishment2,
} from '../../../database/seeds/test/001-establishments';
import { User1 } from '../../../database/seeds/test/003-users';
import { Drafts, formatDraftApi } from '../../repositories/draftRepository';
import {
  Campaigns,
  formatCampaignApi,
} from '../../repositories/campaignRepository';
import { CampaignsDrafts } from '../../repositories/campaignDraftRepository';
import { DraftDTO } from '../../../shared/models/DraftDTO';

describe('Draft API', () => {
  const { app } = createServer();

  const establishment = Establishment1;
  const user = User1;
  const anotherEstablishment = Establishment2;

  describe('GET /drafts', () => {
    const testRoute = '/api/drafts';

    const drafts: DraftApi[] = [
      ...Array.from({ length: 4 }, () => genDraftApi(establishment)),
      ...Array.from({ length: 2 }, () => genDraftApi(anotherEstablishment)),
    ];

    beforeEach(async () => {
      await Drafts().insert(drafts.map(formatDraftApi));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute);
      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list drafts of the authenticated user’s establishment', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await Drafts()
        .where('establishment_id', establishment.id)
        .whereIn(
          'id',
          body.map((draft: DraftDTO) => draft.id)
        );
      expect(body).toHaveLength(actual.length);
    });

    it('should list drafts by campaign', async () => {
      const [firstDraft] = drafts;
      const campaign: CampaignApi = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsDrafts().insert({
        campaign_id: campaign.id,
        draft_id: firstDraft.id,
      });

      const { body, status } = await request(app)
        .get(testRoute)
        .query(`campaign=${campaign.id}`)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(1);
      expect(body).toContainEqual(firstDraft);
    });
  });
});
