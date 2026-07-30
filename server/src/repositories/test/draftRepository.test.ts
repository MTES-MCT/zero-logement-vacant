import { faker } from '@faker-js/faker/locale/fr';

import { kysely } from '~/infra/database/kysely';
import { DraftApi } from '~/models/DraftApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { SenderApi } from '~/models/SenderApi';
import { UserApi } from '~/models/UserApi';
import { toDocumentInsert } from '~/repositories/documentRepository';
import { toSenderInsert } from '~/repositories/senderRepository';
import { factories } from '~/test/factories';
import { genDocumentApi, genDraftApi, genSenderApi } from '~/test/testFixtures';

import draftRepository, { toDraftInsert } from '../draftRepository';

describe('Draft repository', () => {
  let establishment: EstablishmentApi;
  let anotherEstablishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    [establishment, anotherEstablishment] = await Promise.all([
      factories.establishment.create(),
      factories.establishment.create()
    ]);
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('find', () => {
    let sender: SenderApi;
    let drafts: DraftApi[];

    beforeAll(async () => {
      sender = genSenderApi(establishment);
      drafts = Array.from({ length: 5 }, () =>
        genDraftApi(establishment, sender)
      );

      await kysely
        .insertInto('senders')
        .values(toSenderInsert(sender))
        .execute();
      await kysely
        .insertInto('drafts')
        .values(drafts.map(toDraftInsert))
        .execute();
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
      await kysely
        .insertInto('campaignsDrafts')
        .values({ campaignId: campaign.id, draftId: firstDraft.id })
        .execute();

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
    let sender: SenderApi;
    let draft: DraftApi;

    beforeAll(async () => {
      sender = genSenderApi(establishment);
      draft = genDraftApi(establishment, sender);

      await kysely
        .insertInto('senders')
        .values(toSenderInsert(sender))
        .execute();
      await kysely.insertInto('drafts').values(toDraftInsert(draft)).execute();
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
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const documentSender = genSenderApi(establishment);
      documentSender.signatories[0] = {
        firstName: documentSender.signatories[0]?.firstName ?? null,
        lastName: documentSender.signatories[0]?.lastName ?? null,
        role: documentSender.signatories[0]?.role ?? null,
        file: null,
        document
      };
      await kysely
        .insertInto('senders')
        .values(toSenderInsert(documentSender))
        .execute();

      const documentDraft = genDraftApi(establishment, documentSender);
      await kysely
        .insertInto('drafts')
        .values(toDraftInsert(documentDraft))
        .execute();

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
      await kysely
        .insertInto('senders')
        .values(toSenderInsert(sender))
        .execute();

      await draftRepository.save(draft);

      const actual = await kysely
        .selectFrom('drafts')
        .selectAll('drafts')
        .where('id', '=', draft.id)
        .executeTakeFirst();
      expect(actual).toMatchObject(toDraftInsert(draft));
    });

    it('should update a draft if it exists', async () => {
      const sender = genSenderApi(establishment);
      const draft = genDraftApi(establishment, sender);
      await kysely
        .insertInto('senders')
        .values(toSenderInsert(sender))
        .execute();
      await kysely.insertInto('drafts').values(toDraftInsert(draft)).execute();
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

      const actual = await kysely
        .selectFrom('drafts')
        .selectAll('drafts')
        .where('id', '=', draft.id)
        .executeTakeFirst();
      expect(actual).toMatchObject(toDraftInsert(updated));
    });
  });
});
