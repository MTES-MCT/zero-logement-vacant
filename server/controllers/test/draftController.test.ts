import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '../../server';
import { DraftApi } from '../../models/DraftApi';
import {
  genCampaignApi,
  genDraftApi,
  genEstablishmentApi,
  genUserApi,
} from '../../test/testFixtures';
import { tokenProvider } from '../../test/testUtils';
import { CampaignApi } from '../../models/CampaignApi';
import {
  DraftDBO,
  Drafts,
  formatDraftApi,
} from '../../repositories/draftRepository';
import {
  Campaigns,
  formatCampaignApi,
} from '../../repositories/campaignRepository';
import { CampaignsDrafts } from '../../repositories/campaignDraftRepository';
import { DraftDTO, DraftPayloadDTO } from '../../../shared/models/DraftDTO';
import {
  Establishments,
  formatEstablishmentApi,
} from '../../repositories/establishmentRepository';
import { formatUserApi, Users } from '../../repositories/userRepository';

describe('Draft API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const anotherEstablishment = genEstablishmentApi();

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(formatUserApi(user));
  });

  describe('GET /drafts', () => {
    const testRoute = '/api/drafts';

    const drafts: DraftApi[] = [
      ...Array.from({ length: 4 }, () => genDraftApi(establishment)),
      ...Array.from({ length: 2 }, () => genDraftApi(anotherEstablishment)),
    ];

    beforeAll(async () => {
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

  describe('POST /api/drafts', () => {
    const testRoute = '/api/drafts';

    let campaign: CampaignApi;
    let draft: DraftApi;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user.id);
      draft = genDraftApi(establishment);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should fail if the payload has a wrong format', async () => {
      async function fail(payload: Partial<DraftPayloadDTO>): Promise<void> {
        const { status } = await request(app)
          .post(testRoute)
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      }

      await fail({});
      await fail({ body: 'body' });
      await fail({ campaign: campaign.id });
      await fail({ body: '', campaign: campaign.id });
    });

    it('should fail if the campaign to attach is missing', async () => {
      const missingCampaign = genCampaignApi(anotherEstablishment.id, user.id);
      const payload: DraftPayloadDTO = {
        body: draft.body,
        campaign: missingCampaign.id,
      };

      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a draft and attach it to a campaign', async () => {
      const payload: DraftPayloadDTO = {
        body: draft.body,
        campaign: campaign.id,
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<Partial<DraftDTO>>({
        body: payload.body,
      });

      const actualDraft = await Drafts().where({ id: body.id }).first();
      expect(actualDraft).toMatchObject<Partial<DraftDBO>>({
        body: payload.body,
      });
      const actualCampaignDraft = await CampaignsDrafts()
        .where({ campaign_id: campaign.id })
        .first();
      expect(actualCampaignDraft).toBeDefined();
    });
  });
});
