import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
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
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayload,
  DraftUpdatePayloadDTO,
  SenderPayloadDTO,
  SignatoriesDTO,
  SignatoryDTO
} from '@zerologementvacant/models';
import {
  Establishments,
  formatEstablishmentApi
} from '../../repositories/establishmentRepository';
import { formatUserApi, Users } from '../../repositories/userRepository';
import { SenderApi } from '../../models/SenderApi';
import fp from 'lodash/fp';
import {
  formatSenderApi,
  SenderDBO,
  Senders
} from '../../repositories/senderRepository';
import * as posthogService from '~/services/posthogService';
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
    await Users().insert([user, anotherUser].map(formatUserApi));
  });

  describe('GET /drafts', () => {
    const testRoute = '/api/drafts';

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

  describe('POST /api/drafts', () => {
    const testRoute = '/api/drafts';

    let campaign: CampaignApi;
    let draft: DraftApi;
    let sender: SenderApi;
    let senderPayload: SenderPayloadDTO;

    beforeEach(async () => {
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(false);
      campaign = genCampaignApi(establishment.id, user);
      sender = genSenderApi(establishment);
      senderPayload = fp.pick(
        [
          'name',
          'service',
          'firstName',
          'lastName',
          'address',
          'email',
          'phone',
          'signatories'
        ],
        sender
      ) as SenderPayloadDTO;
      draft = genDraftApi(establishment, sender);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    afterEach(() => vi.restoreAllMocks());

    test.prop<DraftCreationPayloadDTO>({
      campaign: fc.uuid({ version: 4 }),
      subject: fc.option(fc.string({ minLength: 1 })),
      body: fc.option(fc.string({ minLength: 1 })),
      logo: fc.constant([]),
      writtenAt: fc.option(
        fc
          .date({
            min: new Date('0001-01-01'),
            max: new Date('9999-12-31'),
            noInvalidDate: true
          })
          .map((date) => date.toJSON().substring(0, 10))
      ),
      writtenFrom: fc.option(fc.string({ minLength: 1 })),
      sender: fc.option(
        fc.record<SenderPayloadDTO>({
          name: fc.option(fc.string({ minLength: 1 })),
          service: fc.option(fc.string({ minLength: 1 })),
          firstName: fc.option(fc.string({ minLength: 1 })),
          lastName: fc.option(fc.string({ minLength: 1 })),
          address: fc.option(fc.string({ minLength: 1 })),
          email: fc.option(fc.string({ minLength: 1 })),
          phone: fc.option(fc.string({ minLength: 1 })),
          signatories: fc.option(
            fc.tuple<SignatoriesDTO>(
              fc.option<SignatoryDTO>(
                fc.record<SignatoryDTO>({
                  firstName: fc.option(fc.string({ minLength: 1 })),
                  lastName: fc.option(fc.string({ minLength: 1 })),
                  role: fc.option(fc.string({ minLength: 1 })),
                  file: fc.constant(null),
                  document: fc.constant(null)
                })
              ),
              fc.option(
                fc.record<SignatoryDTO>({
                  firstName: fc.option(fc.string({ minLength: 1 })),
                  lastName: fc.option(fc.string({ minLength: 1 })),
                  role: fc.option(fc.string({ minLength: 1 })),
                  file: fc.constant(null),
                  document: fc.constant(null)
                })
              )
            )
          )
        })
      )
    })('should validate inputs', async (payload) => {
      const { status } = await request(url)
        .post(testRoute)
        .send({ ...payload, campaign: campaign.id })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should fail if the campaign to attach is missing', async () => {
      const missingCampaign = genCampaignApi(anotherEstablishment.id, user);
      const payload: DraftCreationPayloadDTO = {
        subject: draft.subject,
        body: draft.body,
        // TODO: test with logo
        logo: [],
        campaign: missingCampaign.id,
        sender: senderPayload,
        writtenAt: draft.writtenAt,
        writtenFrom: draft.writtenFrom
      };

      const { status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a draft', async () => {
      const payload: DraftCreationPayloadDTO = {
        subject: draft.subject,
        body: draft.body,
        logo: [],
        campaign: campaign.id,
        sender: senderPayload,
        writtenAt: draft.writtenAt,
        writtenFrom: draft.writtenFrom
      };

      const { body, status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<Partial<DraftDTO>>({
        body: payload.body,
        sender: {
          id: expect.any(String),
          name: payload.sender?.name ?? null,
          service: payload.sender?.service ?? null,
          firstName: payload.sender?.firstName ?? null,
          lastName: payload.sender?.lastName ?? null,
          address: payload.sender?.address ?? null,
          email: payload.sender?.email ?? null,
          phone: payload.sender?.phone ?? null,
          signatories: payload.sender!.signatories,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        },
        writtenAt: payload.writtenAt,
        writtenFrom: payload.writtenFrom
      });

      const actual = await Drafts().where({ id: body.id }).first();
      expect(actual).toStrictEqual<DraftRecordDBO>({
        id: body.id,
        subject: payload.subject,
        body: payload.body,
        logo: payload.logo?.map((logo) => logo.id) ?? null,
        logo_next_one: null,
        logo_next_two: null,
        sender_id: expect.any(String),
        written_at: payload.writtenAt,
        written_from: payload.writtenFrom,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        establishment_id: establishment.id
      });
    });

    it('should attach the draft to a campaign', async () => {
      const payload: DraftCreationPayloadDTO = {
        subject: draft.subject,
        body: draft.body,
        logo: [],
        campaign: campaign.id,
        sender: senderPayload,
        writtenAt: draft.writtenAt,
        writtenFrom: draft.writtenFrom
      };

      const { status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualCampaignDraft = await CampaignsDrafts()
        .where({ campaign_id: campaign.id })
        .first();
      expect(actualCampaignDraft).toBeDefined();
    });
  });

  describe('PUT /drafts/{id}', () => {
    const testRoute = (id: string) => `/api/drafts/${id}`;

    let draft: DraftApi;
    let sender: SenderApi;
    let payload: DraftUpdatePayloadDTO;

    beforeEach(async () => {
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(false);
      sender = genSenderApi(establishment);
      draft = genDraftApi(establishment, sender);
      payload = {
        id: draft.id,
        subject: faker.lorem.sentence(),
        body: faker.lorem.paragraph(),
        logo: [],
        sender: fp.omit(['id', 'createdAt', 'updatedAt'], sender) as SenderPayloadDTO,
        writtenAt: faker.date.recent().toISOString().substring(0, 10),
        writtenFrom: faker.location.city()
      };
      await Senders().insert(formatSenderApi(sender));
      await Drafts().insert(formatDraftApi(draft));
    });

    afterEach(() => vi.restoreAllMocks());

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).put(testRoute(draft.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if the draft does not exist', async () => {
      const { status } = await request(url)
        .put(testRoute(faker.string.uuid()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should fail if the draft belongs to another establishment', async () => {
      const { status } = await request(url)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should fail to validate input', async () => {
      async function fail(id: string, payload: object): Promise<void> {
        const { status } = await request(url)
          .put(testRoute(id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      }

      await fail('bad-format', {
        body: ''
      });
      await fail(faker.string.uuid(), {
        body: undefined
      });
    });

    it('should update a draft', async () => {
      const { body, status } = await request(url)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      expect(body).toStrictEqual<DraftDTO>({
        id: draft.id,
        subject: payload.subject,
        body: payload.body,
        logo: payload.logo,
        logoNext: [null, null],
        sender: {
          id: expect.any(String),
          name: sender.name,
          service: sender.service,
          firstName: sender.firstName,
          lastName: sender.lastName,
          address: sender.address,
          email: sender.email,
          phone: sender.phone,
          signatories: sender.signatories as SignatoriesDTO,
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        },
        writtenAt: payload.writtenAt,
        writtenFrom: payload.writtenFrom,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });

      const actual = await Drafts().where('id', draft.id).first();
      expect(actual).toStrictEqual<DraftRecordDBO>({
        id: draft.id,
        subject: payload.subject,
        body: payload.body,
        logo: payload.logo?.map((logo) => logo.id) ?? null,
        logo_next_one: null,
        logo_next_two: null,
        written_at: payload.writtenAt,
        written_from: payload.writtenFrom,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        establishment_id: draft.establishmentId,
        sender_id: body.sender.id
      });
    });

    it('should update the attached sender', async () => {
      payload = {
        ...payload,
        sender: {
          ...payload.sender,
          name: 'Another name'
        }
      };

      const { status } = await request(url)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actualSender = await Senders()
        .where({
          id: draft.sender.id,
          establishment_id: sender.establishmentId
        })
        .first();
      expect(actualSender).toStrictEqual<SenderDBO>({
        id: expect.any(String),
        name: payload.sender.name,
        service: sender.service,
        first_name: sender.firstName,
        last_name: sender.lastName,
        address: sender.address,
        email: sender.email,
        phone: sender.phone,
        signatory_one_first_name: sender.signatories?.[0]?.firstName ?? null,
        signatory_one_last_name: sender.signatories?.[0]?.lastName ?? null,
        signatory_one_role: sender.signatories?.[0]?.role ?? null,
        signatory_one_file: sender.signatories?.[0]?.file?.id ?? null,
        signatory_one_document_id: null,
        signatory_two_first_name: sender.signatories?.[1]?.firstName ?? null,
        signatory_two_last_name: sender.signatories?.[1]?.lastName ?? null,
        signatory_two_role: sender.signatories?.[1]?.role ?? null,
        signatory_two_file: sender.signatories?.[1]?.file?.id ?? null,
        signatory_two_document_id: null,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        establishment_id: sender.establishmentId
      });

      const actualDraft = await Drafts()
        .where({
          id: draft.id,
          establishment_id: draft.establishmentId
        })
        .first();
      expect(actualDraft).toHaveProperty('sender_id', actualSender?.id);
    });
  });

  describe('POST /api/drafts — new-campaigns', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
    });

    const testRoute = '/api/drafts';
    let campaign: CampaignApi;

    beforeEach(async () => {
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(true);
      campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    afterEach(() => vi.restoreAllMocks());

    it('should fall back to legacy handler when flag is off', async () => {
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(false);
      const payload: DraftCreationPayloadDTO = {
        campaign: campaign.id,
        subject: null,
        body: null,
        logo: [],
        writtenAt: null,
        writtenFrom: null,
        sender: null
      };
      const { status } = await request(url)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));
      expect(status).toBe(constants.HTTP_STATUS_CREATED);
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

  describe('PUT /api/drafts/:id — new-campaigns', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
    });

    const testRoute = (id: string) => `/api/drafts/${id}`;
    let draft: DraftApi;
    let sender: SenderApi;

    beforeEach(async () => {
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(true);
      sender = genSenderApi(establishment);
      draft = genDraftApi(establishment, sender);
      await Senders().insert(formatSenderApi(sender));
      await Drafts().insert(formatDraftApi(draft));
    });

    afterEach(() => vi.restoreAllMocks());

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

    it('should fall back to legacy when flag is off', async () => {
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(false);
      const payload = {
        id: draft.id,
        subject: 'Old',
        body: null,
        logo: [],
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
          signatories: null
        }
      };
      const { status } = await request(url)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(user));
      expect(status).toBe(constants.HTTP_STATUS_OK);
    });
  });
});
