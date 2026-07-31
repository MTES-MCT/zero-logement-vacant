import { constants } from 'http2';

import {
  DraftCreationPayload,
  DraftDTO,
  DraftUpdatePayload,
  SignatoriesDTO
} from '@zerologementvacant/models';
import { CampaignDTO } from '@zerologementvacant/models';
import request from 'supertest';

import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';

import { DraftApi } from '../../models/DraftApi';
import { EstablishmentApi } from '../../models/EstablishmentApi';
import { SenderApi } from '../../models/SenderApi';
import { UserApi } from '../../models/UserApi';
import { toDocumentInsert } from '../../repositories/documentRepository';
import { toDraftInsert } from '../../repositories/draftRepository';
import { toSenderInsert } from '../../repositories/senderRepository';
import { factories } from '../../test/factories';
import {
  genDocumentApi,
  genDraftApi,
  genSenderApi
} from '../../test/testFixtures';
import { tokenProvider } from '../../test/testUtils';

describe('Draft API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let user: UserApi;
  let anotherEstablishment: EstablishmentApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
    anotherEstablishment = await factories.establishment.create();
    await factories.user.create({
      establishmentId: anotherEstablishment.id
    });
  });

  describe('GET /drafts', () => {
    const testRoute = '/drafts';

    let sender: SenderApi;
    let drafts: DraftApi[];

    beforeAll(async () => {
      sender = genSenderApi(establishment);
      drafts = [
        ...Array.from({ length: 4 }, () => genDraftApi(establishment, sender)),
        ...Array.from({ length: 2 }, () =>
          genDraftApi(anotherEstablishment, sender)
        )
      ];
      await kysely
        .insertInto('senders')
        .values(toSenderInsert(sender))
        .execute();
      await kysely
        .insertInto('drafts')
        .values(drafts.map(toDraftInsert))
        .execute();
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list drafts of the authenticated user’s establishment', async () => {
      const { body, status } = await request(url)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await kysely
        .selectFrom('drafts')
        .selectAll('drafts')
        .where('establishmentId', '=', establishment.id)
        .where(
          'id',
          'in',
          body.map((draft: DraftDTO) => draft.id)
        )
        .execute();
      expect(body).toHaveLength(actual.length);
    });

    it('should list drafts by campaign', async () => {
      const [firstDraft] = drafts;
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .insertInto('campaignsDrafts')
        .values({
          campaignId: campaign.id,
          draftId: firstDraft.id
        })
        .execute();

      const { body, status } = await request(url)
        .get(testRoute)
        .query(`campaign=${campaign.id}`)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(1);

      // Build expected DTO manually — S3 is not mocked so toDraftDTO cannot fetch presigned URLs
      const expectedDraftDTO: DraftDTO = {
        id: firstDraft.id,
        subject: firstDraft.subject,
        body: firstDraft.body,
        logo: [],
        logoNext: [null, null],
        sender: {
          id: firstDraft.sender.id,
          name: firstDraft.sender.name,
          service: firstDraft.sender.service,
          firstName: firstDraft.sender.firstName,
          lastName: firstDraft.sender.lastName,
          address: firstDraft.sender.address,
          email: firstDraft.sender.email,
          phone: firstDraft.sender.phone,
          signatories: firstDraft.sender.signatories as SignatoriesDTO,
          createdAt: firstDraft.sender.createdAt,
          updatedAt: firstDraft.sender.updatedAt
        },
        writtenAt: firstDraft.writtenAt,
        writtenFrom: firstDraft.writtenFrom,
        createdAt: firstDraft.createdAt,
        updatedAt: firstDraft.updatedAt
      };

      expect(body).toContainEqual(expectedDraftDTO);
    });
  });

  describe('POST /drafts', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
    });

    const testRoute = '/drafts';
    let campaign: CampaignDTO;

    beforeEach(async () => {
      campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
    });

    it('should create a draft with logoNext [null, null] and signatories [null, null]', async () => {
      const payload: DraftCreationPayload = {
        campaign: campaign.id,
        subject: 'Test',
        body: 'Body',
        logo: [null, null],
        writtenAt: null,
        writtenFrom: null,
        sender: {
          name: 'Mairie',
          service: null,
          firstName: null,
          lastName: null,
          address: null,
          email: null,
          phone: null,
          signatories: [null, null]
        }
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({ logoNext: [null, null] });

      const actualSender = await kysely
        .selectFrom('senders')
        .selectAll('senders')
        .where('id', '=', body.sender.id)
        .executeTakeFirst();
      expect(actualSender!.signatoryOneDocumentId).toBeNull();
      expect(actualSender!.signatoryTwoDocumentId).toBeNull();

      const actualDraft = await kysely
        .selectFrom('drafts')
        .selectAll('drafts')
        .where('id', '=', body.id)
        .executeTakeFirst();
      expect(actualDraft!.logoNextOne).toBeNull();
      expect(actualDraft!.logoNextTwo).toBeNull();
    });

    it('should link signatory document', async () => {
      const document = genDocumentApi({
        establishmentId: establishment.id,
        creator: user
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const payload: DraftCreationPayload = {
        campaign: campaign.id,
        subject: null,
        body: null,
        logo: [null, null],
        writtenAt: null,
        writtenFrom: null,
        sender: {
          name: null,
          service: null,
          firstName: null,
          lastName: null,
          address: null,
          email: null,
          phone: null,
          signatories: [
            {
              firstName: 'Alice',
              lastName: 'Dupont',
              role: 'Maire',
              document: document.id
            },
            null
          ]
        }
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualSender = await kysely
        .selectFrom('senders')
        .selectAll('senders')
        .where('id', '=', body.sender.id)
        .executeTakeFirst();
      expect(actualSender!.signatoryOneDocumentId).toBe(document.id);
      expect(actualSender!.signatoryTwoDocumentId).toBeNull();
    });

    it('should link logo documents', async () => {
      const logoDoc = genDocumentApi({
        establishmentId: establishment.id,
        creator: user
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(logoDoc))
        .execute();

      const payload: DraftCreationPayload = {
        campaign: campaign.id,
        subject: null,
        body: null,
        logo: [logoDoc.id, null],
        writtenAt: null,
        writtenFrom: null,
        sender: null
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualDraft = await kysely
        .selectFrom('drafts')
        .selectAll('drafts')
        .where('id', '=', body.id)
        .executeTakeFirst();
      expect(actualDraft!.logoNextOne).toBe(logoDoc.id);
      expect(actualDraft!.logoNextTwo).toBeNull();
    });
  });

  describe('PUT /drafts/:id', () => {
    let establishment: EstablishmentApi;
    let user: UserApi;

    beforeAll(async () => {
      establishment = await factories.establishment.create();
      user = await factories.user.create({ establishmentId: establishment.id });
    });

    const testRoute = (id: string) => `/drafts/${id}`;
    let draft: DraftApi;
    let sender: SenderApi;

    beforeEach(async () => {
      sender = genSenderApi(establishment);
      draft = genDraftApi(establishment, sender);
      await kysely
        .insertInto('senders')
        .values(toSenderInsert(sender))
        .execute();
      await kysely.insertInto('drafts').values(toDraftInsert(draft)).execute();
    });

    it('should update logoNext and signatory document', async () => {
      const document = genDocumentApi({
        establishmentId: establishment.id,
        creator: user
      });
      await kysely
        .insertInto('documents')
        .values(toDocumentInsert(document))
        .execute();

      const payload: DraftUpdatePayload = {
        id: draft.id,
        subject: 'Updated',
        body: null,
        logo: [document.id, null],
        writtenAt: null,
        writtenFrom: null,
        sender: {
          name: null,
          service: null,
          firstName: null,
          lastName: null,
          address: null,
          email: null,
          phone: null,
          signatories: [
            {
              firstName: 'Bob',
              lastName: 'Martin',
              role: 'DGA',
              document: document.id
            },
            null
          ]
        }
      };

      const { body, status } = await request(url)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actualDraft = await kysely
        .selectFrom('drafts')
        .selectAll('drafts')
        .where('id', '=', draft.id)
        .executeTakeFirst();
      expect(actualDraft!.logoNextOne).toBe(document.id);

      const actualSender = await kysely
        .selectFrom('senders')
        .selectAll('senders')
        .where('id', '=', body.sender.id)
        .executeTakeFirst();
      expect(actualSender!.signatoryOneDocumentId).toBe(document.id);
    });
  });
});
