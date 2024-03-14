import { faker } from '@faker-js/faker/locale/fr';

import {
  genCampaignApi,
  genDraftApi,
  genEstablishmentApi,
  genUserApi,
} from '../../test/testFixtures';
import draftRepository, { Drafts, formatDraftApi } from '../draftRepository';
import { Campaigns, formatCampaignApi } from '../campaignRepository';
import { CampaignsDrafts } from '../campaignDraftRepository';
import { Establishment2 } from '../../../database/seeds/test/001-establishments';
import { DraftApi } from '../../models/DraftApi';
import {
  Establishments,
  formatEstablishmentApi,
} from '../establishmentRepository';
import { formatUserApi, Users } from '../userRepository';

describe('Draft repository', () => {
  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });
  const anotherEstablishment = Establishment2;

  describe('find', () => {
    let drafts: DraftApi[];

    beforeAll(async () => {
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

  describe('findOne', () => {
    const draft = genDraftApi(establishment);

    beforeAll(async () => {
      await Drafts().insert(formatDraftApi(draft));
    });

    it('should return null if the draft is missing', async () => {
      const actual = await draftRepository.findOne({
        id: faker.string.uuid(),
        establishmentId: establishment.id,
      });

      expect(actual).toBeNull();
    });

    it('should return null if the draft belongs to another establishment', async () => {
      const actual = await draftRepository.findOne({
        id: draft.id,
        establishmentId: anotherEstablishment.id,
      });

      expect(actual).toBeNull();
    });

    it('should return the draft', async () => {
      const actual = await draftRepository.findOne({
        id: draft.id,
        establishmentId: draft.establishmentId,
      });

      expect(actual).toStrictEqual<DraftApi>(draft);
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
