import { genCampaignApi, genDraftApi } from '../../test/testFixtures';
import draftRepository, { Drafts, formatDraftApi } from '../draftRepository';
import { Campaigns, formatCampaignApi } from '../campaignRepository';
import { CampaignsDrafts } from '../campaignDraftRepository';
import { Establishment1 } from '../../../database/seeds/test/001-establishments';
import { User1 } from '../../../database/seeds/test/003-users';
import { DraftApi } from '../../models/DraftApi';

describe('Draft repository', () => {
  const establishment = Establishment1;
  const user = User1;

  describe('find', () => {
    let drafts: DraftApi[];

    beforeEach(async () => {
      drafts = Array.from({ length: 5 }, () => genDraftApi(establishment));
      await Drafts().insert(drafts.map(formatDraftApi));
    });

    it('should list drafts', async () => {
      const actual = await draftRepository.find();

      expect(actual).toIncludeAllMembers(drafts);
    });

    it('should find drafts by campaign', async () => {
      const [firstDraft] = drafts;
      const campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsDrafts().insert({
        campaign_id: campaign.id,
        draft_id: firstDraft.id,
      });

      const actual = await draftRepository.find({
        filters: {
          campaign: campaign.id,
        },
      });

      expect(actual).toBeArrayOfSize(1);
      expect(actual).toContainEqual(firstDraft);
    });
  });

  describe('save', () => {
    const draft = genDraftApi(establishment);

    it('should create a draft that does not exist', async () => {
      await draftRepository.save(draft);

      const actual = await Drafts().where({ id: draft.id }).first();
      expect(actual).toStrictEqual(formatDraftApi(draft));
    });
  });
});
