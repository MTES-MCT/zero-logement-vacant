import { faker } from '@faker-js/faker/locale/fr';

import { DraftApi } from '~/models/DraftApi';
import { SenderApi } from '~/models/SenderApi';
import { factories } from '~/test/factories';
import {
  genDocumentApi,
  genDraftApi,
  genEstablishmentApi,
  genSenderApi,
  genUserApi
} from '~/test/testFixtures';

import { CampaignsDrafts } from '../campaignDraftRepository';
import { Documents, toDocumentDBO } from '../documentRepository';
import draftRepository, { Drafts, formatDraftApi } from '../draftRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import { formatSenderApi, Senders } from '../senderRepository';
import { toUserDBO, Users } from '../userRepository';

describe('Draft repository', () => {
  const establishment = genEstablishmentApi();
  const anotherEstablishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert(toUserDBO(user));
  });

  describe('find', () => {
    const sender: SenderApi = genSenderApi(establishment);
    const drafts: DraftApi[] = Array.from({ length: 5 }, () =>
      genDraftApi(establishment, sender)
    );

    beforeAll(async () => {
      await Senders().insert(formatSenderApi(sender));
      await Drafts().insert(drafts.map(formatDraftApi));
    });

    it('should list drafts', async () => {
      const actual = await draftRepository.find();

      expect(actual).toIncludeAllPartialMembers(drafts);
    });

    it('should find drafts by campaign', async () => {
      const [firstDraft] = drafts;
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await CampaignsDrafts().insert({
        campaign_id: campaign.id,
        draft_id: firstDraft.id
      });

      const actual = await draftRepository.find({
        filters: {
          campaign: campaign.id
        }
      });

      expect(actual).toBeArrayOfSize(1);
      expect(actual).toPartiallyContain<Partial<DraftApi>>(firstDraft);
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
        establishmentId: establishment.id
      });

      expect(actual).toBeNull();
    });

    it('should return null if the draft belongs to another establishment', async () => {
      const actual = await draftRepository.findOne({
        id: draft.id,
        establishmentId: anotherEstablishment.id
      });

      expect(actual).toBeNull();
    });

    it('should return the draft', async () => {
      const actual = await draftRepository.findOne({
        id: draft.id,
        establishmentId: draft.establishmentId
      });

      expect(actual).toStrictEqual<DraftApi>(draft);
    });

    it('should hydrate a signatory document with its nested creator', async () => {
      const document = genDocumentApi({
        establishmentId: establishment.id,
        creator: user
      });
      await Documents().insert(toDocumentDBO(document));

      const documentSender = genSenderApi(establishment);
      documentSender.signatories[0] = {
        firstName: documentSender.signatories[0]?.firstName ?? null,
        lastName: documentSender.signatories[0]?.lastName ?? null,
        role: documentSender.signatories[0]?.role ?? null,
        file: null,
        document
      };
      await Senders().insert(formatSenderApi(documentSender));

      const documentDraft = genDraftApi(establishment, documentSender);
      await Drafts().insert(formatDraftApi(documentDraft));

      const actual = await draftRepository.findOne({
        id: documentDraft.id,
        establishmentId: documentDraft.establishmentId
      });

      expect(actual).not.toBeNull();
      expect(actual?.sender.signatories[0]?.document).toMatchObject({
        id: document.id,
        filename: document.filename,
        s3Key: document.s3Key,
        createdBy: user.id,
        creator: expect.objectContaining({
          id: user.id,
          email: user.email
        })
      });
      // the second (empty) signatory must stay null
      expect(actual?.sender.signatories[1]?.document).toBeNull();
    });
  });

  describe('save', () => {
    it('should create a draft that does not exist', async () => {
      const sender = genSenderApi(establishment);
      const draft = genDraftApi(establishment, sender);
      await Senders().insert(formatSenderApi(sender));

      await draftRepository.save(draft);

      const actual = await Drafts().where({ id: draft.id }).first();
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
        updatedAt: new Date().toJSON()
      };

      await draftRepository.save(updated);

      const actual = await Drafts().where({ id: draft.id }).first();
      expect(actual).toStrictEqual(formatDraftApi(updated));
    });
  });
});
