import { faker } from '@faker-js/faker/locale/fr';
import { constants } from 'http2';
import request from 'supertest';

import { createServer } from '../../server';
import { DraftApi, toDraftDTO } from '../../models/DraftApi';
import {
  genCampaignApi,
  genDraftApi,
  genEstablishmentApi,
  genSenderApi,
  genUserApi,
} from '../../test/testFixtures';
import { tokenProvider } from '../../test/testUtils';
import { CampaignApi } from '../../models/CampaignApi';
import {
  DraftRecordDBO,
  Drafts,
  formatDraftApi,
} from '../../repositories/draftRepository';
import {
  Campaigns,
  formatCampaignApi,
} from '../../repositories/campaignRepository';
import { CampaignsDrafts } from '../../repositories/campaignDraftRepository';
import {
  DraftCreationPayloadDTO,
  DraftDTO,
  DraftUpdatePayloadDTO,
} from '../../../shared/models/DraftDTO';
import {
  Establishments,
  formatEstablishmentApi,
} from '../../repositories/establishmentRepository';
import { formatUserApi, Users } from '../../repositories/userRepository';
import { SenderApi } from '../../models/SenderApi';
import fp from 'lodash/fp';
import {
  formatSenderApi,
  SenderDBO,
  Senders,
} from '../../repositories/senderRepository';
import { SenderPayloadDTO } from '../../../shared';

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
      ),
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
        draft_id: firstDraft.id,
      });

      const { body, status } = await request(app)
        .get(testRoute)
        .query(`campaign=${campaign.id}`)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toBeArrayOfSize(1);
      expect(body).toContainEqual(toDraftDTO(firstDraft));
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
        ],
        sender
      );
      draft = genDraftApi(establishment, sender);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should fail if the payload has a wrong format', async () => {
      async function fail(
        payload: Partial<DraftCreationPayloadDTO>
      ): Promise<void> {
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
      const payload: DraftCreationPayloadDTO = {
        body: draft.body,
        campaign: missingCampaign.id,
        sender: senderPayload,
      };

      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create a draft and attach it to a campaign', async () => {
      const payload: DraftCreationPayloadDTO = {
        body: draft.body,
        campaign: campaign.id,
        sender: senderPayload,
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject<Partial<DraftDTO>>({
        body: payload.body,
      });
    });

    it('should attach the draft to a campaign', async () => {
      const payload: DraftCreationPayloadDTO = {
        body: draft.body,
        campaign: campaign.id,
        sender: senderPayload,
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

    it('should attach an existing sender to the draft', async () => {
      await Senders().insert(formatSenderApi(sender));
      const payload: DraftCreationPayloadDTO = {
        body: draft.body,
        campaign: campaign.id,
        sender: senderPayload,
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualDraft = await Drafts()
        .where({ id: body.id, establishment_id: establishment.id })
        .first();
      expect(actualDraft).toHaveProperty('sender_id', sender.id);
    });

    it('should create a sender if it does not exist and attach it to the draft', async () => {
      const payload: DraftCreationPayloadDTO = {
        body: draft.body,
        campaign: campaign.id,
        sender: senderPayload,
      };

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);

      const actualDraft = await Drafts()
        .where({ id: body.id, establishment_id: establishment.id })
        .first();
      const actualSender = await Senders()
        .where({ id: actualDraft?.sender_id })
        .first();
      expect(actualSender).toMatchObject<Partial<SenderDBO>>({
        name: sender.name,
        establishment_id: sender.establishmentId,
      });
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
        body: 'Look at that body!',
        sender: fp.omit(['id', 'createdAt', 'updatedAt'], sender),
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
        body: '',
      });
      await fail(faker.string.uuid(), {
        body: undefined,
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
        body: payload.body,
        sender: {
          id: expect.any(String),
          name: sender.name,
          service: sender.service,
          firstName: sender.firstName,
          lastName: sender.lastName,
          address: sender.address,
          email: sender.email,
          phone: sender.phone,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const actual = await Drafts().where('id', draft.id).first();
      expect(actual).toStrictEqual<DraftRecordDBO>({
        id: draft.id,
        body: payload.body,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        establishment_id: draft.establishmentId,
        sender_id: body.sender.id,
      });
    });

    it('should update an existing sender', async () => {
      // Store the sender beforehand
      const anotherSender = genSenderApi(establishment);
      await Senders().insert(formatSenderApi(anotherSender));
      payload = { ...payload, sender: anotherSender };

      const { status } = await request(app)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actual = await Senders()
        .where({
          name: sender.name,
          establishment_id: sender.establishmentId,
        })
        .first();
      expect(actual).toStrictEqual<SenderDBO>({
        id: sender.id,
        name: sender.name,
        service: sender.service,
        first_name: sender.firstName,
        last_name: sender.lastName,
        address: sender.address,
        email: sender.email,
        phone: sender.phone,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        establishment_id: sender.establishmentId,
      });
    });

    it('should create a new sender if the name changes', async () => {
      payload = {
        ...payload,
        sender: {
          ...payload.sender,
          name: 'Another name',
        },
      };

      const { status } = await request(app)
        .put(testRoute(draft.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actualSender = await Senders()
        .where({
          name: payload.sender.name,
          establishment_id: sender.establishmentId,
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
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        establishment_id: sender.establishmentId,
      });

      const actualDraft = await Drafts()
        .where({
          id: draft.id,
          establishment_id: draft.establishmentId,
        })
        .first();
      expect(actualDraft).toHaveProperty('sender_id', actualSender?.id);
    });

    it.todo('should update a draft and update sender if existing');
  });
});
