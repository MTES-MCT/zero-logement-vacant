import { faker } from '@faker-js/faker/locale/fr';

import {
  genCampaignApi,
  genDraftApi,
  genEstablishmentApi,
  genSenderApi,
  genUserApi
} from '~/test/testFixtures';
import draftRepository, { Drafts, formatDraftApi } from '../draftRepository';
import { Campaigns, formatCampaignApi } from '../campaignRepository';
import { CampaignsDrafts } from '../campaignDraftRepository';
import { DraftApi } from '~/models/DraftApi';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import { formatUserApi, Users } from '../userRepository';
import { SenderApi } from '~/models/SenderApi';
import { formatSenderApi, Senders } from '../senderRepository';

describe('Draft repository', () => {
  const establishment = genEstablishmentApi();
  const anotherEstablishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(formatUserApi(user));
  });

  describe('find', () => {
    const sender: SenderApi = genSenderApi(establishment);
    const drafts: DraftApi[] = Array.from({ length: 5, }, () =>
      genDraftApi(establishment, sender)
    );

    beforeAll(async () => {
      await Senders().insert(formatSenderApi(sender));
      await Drafts().insert(drafts.map(formatDraftApi));
    });

    it('should list drafts', async () => {
      let actual = await draftRepository.find();

      actual = actual.map(actual => {
        if(actual !== null && actual.sender?.signatoryFile !== null) {
          actual.sender.signatoryFile.url = '';
        }
        return actual;
      });

      const draftsToCheck = drafts.map(draft => {
        if(draft !== null && draft.sender?.signatoryFile !== null) {
          draft.sender.signatoryFile.url = '';
        }
        return draft;
      });

      expect(actual).toIncludeAllMembers(draftsToCheck);
    });

    it('should find drafts by campaign', async () => {
      const [firstDraft] = drafts;
      const campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsDrafts().insert({
        campaign_id: campaign.id,
        draft_id: firstDraft.id,
      });

      let actual = await draftRepository.find({
        filters: {
          campaign: campaign.id,
        },
      });


      actual = actual.map(actual => {
        if(actual !== null && actual.sender?.signatoryFile !== null) {
          actual.sender.signatoryFile.url = '';
        }
        return actual;
      });

      if(firstDraft?.sender.signatoryFile !== null) {
        firstDraft.sender.signatoryFile.url = '';
      }

      expect(actual).toBeArrayOfSize(1);
      expect(actual).toContainEqual(firstDraft);
    });
  });

  describe('findOne', () => {
    const sender = genSenderApi(establishment);
    const draft = genDraftApi(establishment, sender);

    beforeAll(async () => {
      await Senders().insert(formatSenderApi(sender));
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

      if(actual !== null && actual?.sender.signatoryFile !== null) {
        actual.sender.signatoryFile.url = '';
      }

      if(draft?.sender.signatoryFile !== null) {
        draft.sender.signatoryFile.url = '';
      }

      expect(actual).toStrictEqual<DraftApi>(draft);
    });
  });

  describe('save', () => {
    it('should create a draft that does not exist', async () => {
      const sender = genSenderApi(establishment);
      const draft = genDraftApi(establishment, sender);
      await Senders().insert(formatSenderApi(sender));

      await draftRepository.save(draft);

      const actual = await Drafts().where({ id: draft.id, }).first();
      expect(actual).toStrictEqual(formatDraftApi(draft));
    });

    it('should update a draft if it exists', async () => {
      const sender = genSenderApi(establishment);
      const draft = genDraftApi(establishment, sender);
      await Senders().insert(formatSenderApi(sender));
      await Drafts().insert(formatDraftApi(draft));
      const payload = genDraftApi(establishment, sender);
      const updated: DraftApi = {
        ...draft,
        subject: payload.subject,
        body: payload.body,
        writtenAt: payload.writtenAt,
        writtenFrom: payload.writtenFrom,
        updatedAt: new Date().toJSON(),
      };

      await draftRepository.save(updated);

      const actual = await Drafts().where({ id: draft.id, }).first();
      expect(actual).toStrictEqual(formatDraftApi(updated));
    });
  });
});
