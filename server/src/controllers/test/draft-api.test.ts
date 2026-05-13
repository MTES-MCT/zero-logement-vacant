import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { DraftApi } from '../../models/DraftApi';
import {
  genCampaignApi,
  genDocumentApi,
  genDraftApi,
  genEstablishmentApi,
  genSenderApi,
  genUserApi
} from '../../test/testFixtures';
import { tokenProvider } from '../../test/testUtils';
import { CampaignApi } from '../../models/CampaignApi';
import {
  DraftRecordDBO,
  Drafts,
  formatDraftApi
} from '../../repositories/draftRepository';
import {
  Campaigns,
  formatCampaignApi
} from '../../repositories/campaignRepository';
import { CampaignsDrafts } from '../../repositories/campaignDraftRepository';
import {
  DraftCreationPayload,
  DraftDTO,
  DraftUpdatePayload,
  SignatoriesDTO
} from '@zerologementvacant/models';
import {
  Establishments,
  formatEstablishmentApi
} from '../../repositories/establishmentRepository';
import { toUserDBO, Users } from '../../repositories/userRepository';
import { SenderApi } from '../../models/SenderApi';
import {
  formatSenderApi,
  SenderDBO,
  Senders
} from '../../repositories/senderRepository';
import {
  Documents,
  toDocumentDBO
} from '../../repositories/documentRepository';

describe('Draft API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);
  const anotherEstablishment = genEstablishmentApi();
  const anotherUser = genUserApi(anotherEstablishment.id);

  beforeAll(async () => {
    await Establishments().insert(
      [establishment, anotherEstablishment].map(formatEstablishmentApi)
    );
    await Users().insert([user, anotherUser].map(toUserDBO));
  });

  describe('GET /drafts', () => {
    const testRoute = '/drafts';

    const sender = genSenderApi(establishment);
    const drafts: DraftApi[] = [
      ...Array.from({ length: 4 }, () => genDraftApi(establishment, sender)),
      ...Array.from({ length: 2 }, () =>
        genDraftApi(anotherEstablishment, sender)
      )
    ];

    beforeAll(async () => {
      await Senders().insert(formatSenderApi(sender));
      await Drafts().insert(drafts.map(formatDraftApi));
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
      const campaign: CampaignApi = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
      await CampaignsDrafts().insert({
        campaign_id: campaign.id,
        draft_id: firstDraft.id
      });

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
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(toUserDBO(user));
    });

    const testRoute = '/drafts';
    let campaign: CampaignApi;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
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

      const actualSender = await Senders()
        .where({ id: body.sender.id })
        .first();
      expect(actualSender!.signatory_one_document_id).toBeNull();
      expect(actualSender!.signatory_two_document_id).toBeNull();

      const actualDraft = await Drafts().where({ id: body.id }).first();
      expect(actualDraft!.logo_next_one).toBeNull();
      expect(actualDraft!.logo_next_two).toBeNull();
    });

    it('should link signatory document', async () => {
      const document = genDocumentApi({
        establishmentId: establishment.id,
        creator: user
      });
      await Documents().insert(toDocumentDBO(document));

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

      const actualSender = (await Senders()
        .where({ id: body.sender.id })
        .first()) as SenderDBO;
      expect(actualSender.signatory_one_document_id).toBe(document.id);
      expect(actualSender.signatory_two_document_id).toBeNull();
    });

    it('should link logo documents', async () => {
      const logoDoc = genDocumentApi({
        establishmentId: establishment.id,
        creator: user
      });
      await Documents().insert(toDocumentDBO(logoDoc));

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

      const actualDraft = (await Drafts()
        .where({ id: body.id })
        .first()) as DraftRecordDBO;
      expect(actualDraft.logo_next_one).toBe(logoDoc.id);
      expect(actualDraft.logo_next_two).toBeNull();
    });
  });

  describe('PUT /drafts/:id', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(toUserDBO(user));
    });

    const testRoute = (id: string) => `/drafts/${id}`;
    let draft: DraftApi;
    let sender: SenderApi;

    beforeEach(async () => {
      sender = genSenderApi(establishment);
      draft = genDraftApi(establishment, sender);
      await Senders().insert(formatSenderApi(sender));
      await Drafts().insert(formatDraftApi(draft));
    });

    it('should update logoNext and signatory document', async () => {
      const document = genDocumentApi({
        establishmentId: establishment.id,
        creator: user
      });
      await Documents().insert(toDocumentDBO(document));

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

      const actualDraft = (await Drafts()
        .where({ id: draft.id })
        .first()) as DraftRecordDBO;
      expect(actualDraft.logo_next_one).toBe(document.id);

      const actualSender = (await Senders()
        .where({ id: body.sender.id })
        .first()) as SenderDBO;
      expect(actualSender.signatory_one_document_id).toBe(document.id);
    });

  });
});
