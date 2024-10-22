import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/jest';
import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '~/infra/server';
import { DraftApi, toDraftDTO } from '../../models/DraftApi';
import {
  genCampaignApi,
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
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO,
  FileUploadDTO,
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

describe('Draft API', () => {
  const { app } = createServer();

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
        draft_id: firstDraft.id
      });

      const { body, status } = await request(app)
        .get(testRoute)
        .query(`campaign=${campaign.id}`)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(1);

      const draftDTO = toDraftDTO(firstDraft);
      // Overwriting because S3 is not mocked, causing it to fail, and there is no logo available
      draftDTO.logo = [];
      draftDTO.sender.signatories?.forEach((signatory) => {
        if (signatory) {
          signatory.file = null;
        }
      });

      expect(body).toContainEqual(draftDTO);
    });
  });

  describe('POST /api/drafts', () => {
    const testRoute = '/api/drafts';

    let campaign: CampaignApi;
    let draft: DraftApi;
    let sender: SenderApi;
    let senderPayload: SenderPayloadDTO;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user.id);
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
      );
      draft = genDraftApi(establishment, sender);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    test.prop<DraftCreationPayloadDTO>({
      campaign: fc.uuid({ version: 4 }),
      subject: fc.option(fc.string({ minLength: 1 })),
      body: fc.option(fc.string({ minLength: 1 })),
      logo: fc.constant([]),
      writtenAt: fc.option(
        fc
          .date({ min: new Date('0001-01-01'), max: new Date('9999-12-31') })
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
                  file: fc.option(
                    fc.record<FileUploadDTO>({
                      id: fc.uuid({ version: 4 }),
                      url: fc.webUrl(),
                      content: fc.string({ minLength: 1 }),
                      type: fc.string({ minLength: 1 })
                    })
                  )
                })
              ),
              fc.option(
                fc.record<SignatoryDTO>({
                  firstName: fc.option(fc.string({ minLength: 1 })),
                  lastName: fc.option(fc.string({ minLength: 1 })),
                  role: fc.option(fc.string({ minLength: 1 })),
                  file: fc.option(
                    fc.record<FileUploadDTO>({
                      id: fc.uuid({ version: 4 }),
                      url: fc.webUrl(),
                      content: fc.string({ minLength: 1 }),
                      type: fc.string({ minLength: 1 })
                    })
                  )
                })
              )
            )
          )
        })
      )
    })('should validate inputs', async (payload) => {
      const { status } = await request(app)
        .post(testRoute)
        .send({ ...payload, campaign: campaign.id })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should fail if the campaign to attach is missing', async () => {
      const missingCampaign = genCampaignApi(anotherEstablishment.id, user.id);
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

      const { status } = await request(app)
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

      const { body, status } = await request(app)
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
          signatories: payload.sender?.signatories ?? null,
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

      const { status } = await request(app)
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
      sender = genSenderApi(establishment);
      draft = genDraftApi(establishment, sender);
      payload = {
        id: draft.id,
        subject: faker.lorem.sentence(),
        body: faker.lorem.paragraph(),
        logo: [],
        sender: fp.omit(['id', 'createdAt', 'updatedAt'], sender),
        writtenAt: faker.date.recent().toISOString().substring(0, 10),
        writtenFrom: faker.location.city()
      };
      await Senders().insert(formatSenderApi(sender));
      await Drafts().insert(formatDraftApi(draft));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).put(testRoute(draft.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if the draft does not exist', async () => {
      const { status } = await request(app)
        .put(testRoute(faker.string.uuid()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should fail if the draft belongs to another establishment', async () => {
      const { status } = await request(app)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(anotherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should fail to validate input', async () => {
      async function fail(id: string, payload: object): Promise<void> {
        const { status } = await request(app)
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
      const { body, status } = await request(app)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      expect(body).toStrictEqual<DraftDTO>({
        id: draft.id,
        subject: payload.subject,
        body: payload.body,
        logo: payload.logo,
        sender: {
          id: expect.any(String),
          name: sender.name,
          service: sender.service,
          firstName: sender.firstName,
          lastName: sender.lastName,
          address: sender.address,
          email: sender.email,
          phone: sender.phone,
          signatories: sender.signatories ?? null,
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

      const { status } = await request(app)
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
        signatory_two_first_name: sender.signatories?.[1]?.firstName ?? null,
        signatory_two_last_name: sender.signatories?.[1]?.lastName ?? null,
        signatory_two_role: sender.signatories?.[1]?.role ?? null,
        signatory_two_file: sender.signatories?.[1]?.file?.id ?? null,
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
});
