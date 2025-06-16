import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/jest';
import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  CAMPAIGN_COUNT_VALUES,
  CampaignCreationPayloadDTO,
  CampaignDTO,
  CampaignRemovalPayloadDTO,
  CampaignStatus,
  CampaignUpdatePayloadDTO,
  DATA_FILE_YEAR_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  HOUSING_BY_BUILDING_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  LIVING_AREA_VALUES,
  LOCALITY_KIND_VALUES,
  OCCUPANCY_VALUES,
  OWNER_AGE_VALUES,
  OWNER_KIND_VALUES,
  OWNERSHIP_KIND_VALUES,
  ROOM_COUNT_VALUES,
  VACANCY_RATE_VALUES,
  VACANCY_YEAR_VALUES
} from '@zerologementvacant/models';

import { isDefined } from '@zerologementvacant/utils';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from '~/infra/server';
import { CampaignApi } from '~/models/CampaignApi';
import { CampaignEventApi } from '~/models/EventApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { CampaignsDrafts } from '~/repositories/campaignDraftRepository';
import {
  CampaignHousingDBO,
  CampaignsHousing,
  campaignsHousingTable,
  formatCampaignHousingApi
} from '~/repositories/campaignHousingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import { Drafts, formatDraftApi } from '~/repositories/draftRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  CAMPAIGN_EVENTS_TABLE,
  CAMPAIGN_HOUSING_EVENTS_TABLE,
  CampaignEvents,
  EventDBO,
  Events,
  formatCampaignEventApi,
  formatEventApi,
  HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing
} from '~/repositories/groupRepository';
import {
  formatOwnerHousingApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { formatSenderApi, Senders } from '~/repositories/senderRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genCampaignApi,
  genDraftApi,
  genEstablishmentApi,
  genEventApi,
  genGroupApi,
  genHousingApi,
  genSenderApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Campaign API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /campaigns/{id}', () => {
    const campaign = genCampaignApi(establishment.id, user.id);
    const testRoute = (id: string) => `/api/campaigns/${id}`;

    beforeAll(async () => {
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(app).get(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      const { status } = await request(app)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return an error when there is no campaign with the required id', async () => {
      const { status } = await request(app)
        .get(testRoute(uuidv4()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the campaign', async () => {
      const { body, status } = await request(app)
        .get(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: campaign.id,
        filters: expect.objectContaining(campaign.filters)
      });
    });
  });

  describe('GET /campaigns', () => {
    const testRoute = '/api/campaigns';

    const campaigns: CampaignApi[] = Array.from({ length: 3 }).map(() =>
      genCampaignApi(establishment.id, user.id)
    );

    beforeAll(async () => {
      await Campaigns().insert(campaigns.map(formatCampaignApi));
    });

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(app).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list campaigns', async () => {
      const { body, status } = await request(app)
        .get(testRoute)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toIncludeAllPartialMembers(
        campaigns.map((campaign) => {
          return {
            id: campaign.id
          };
        })
      );
    });

    it('should filter by group', async () => {
      const groups = Array.from({ length: 2 }).map(() =>
        genGroupApi(user, establishment)
      );
      await Groups().insert(groups.map(formatGroupApi));
      const campaigns = groups.map((group) => {
        return genCampaignApi(establishment.id, user.id, group);
      });
      await Campaigns().insert(campaigns.map(formatCampaignApi));
      const query = 'groups=' + groups.map((group) => group.id).join(',');

      const { body, status } = await request(app)
        .get(testRoute)
        .query(query)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toIncludeAllPartialMembers(
        campaigns.map((campaign) => {
          return {
            id: campaign.id,
            groupId: campaign.groupId
          };
        })
      );
    });
  });

  describe('POST /campaigns', () => {
    const testRoute = '/api/campaigns';

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    test.prop<CampaignCreationPayloadDTO>({
      title: fc.stringMatching(/\S/),
      description: fc.stringMatching(/\S/),
      housing: fc.record({
        all: fc.boolean(),
        ids: fc.array(fc.uuid()),
        filters: fc.record({
          housingIds: fc.array(fc.uuid()),
          occupancies: fc.array(fc.constantFrom(...OCCUPANCY_VALUES)),
          energyConsumption: fc.array(
            fc.constantFrom(...ENERGY_CONSUMPTION_VALUES)
          ),
          establishmentIds: fc.array(fc.uuid()),
          groupIds: fc.array(fc.uuid()),
          campaignsCounts: fc.array(fc.constantFrom(...CAMPAIGN_COUNT_VALUES)),
          campaignIds: fc.array(fc.oneof(fc.constant(null), fc.uuid())),
          ownerIds: fc.array(fc.uuid()),
          ownerKinds: fc.array(fc.constantFrom(...OWNER_KIND_VALUES)),
          ownerAges: fc.array(fc.constantFrom(...OWNER_AGE_VALUES)),
          multiOwners: fc.array(fc.boolean()),
          beneficiaryCounts: fc.array(
            fc.constantFrom(...BENEFIARY_COUNT_VALUES)
          ),
          housingKinds: fc.array(fc.constantFrom(...HOUSING_KIND_VALUES)),
          housingAreas: fc.array(fc.constantFrom(...LIVING_AREA_VALUES)),
          roomsCounts: fc.array(fc.constantFrom(...ROOM_COUNT_VALUES)),
          cadastralClassifications: fc.array(
            fc.constantFrom(...CADASTRAL_CLASSIFICATION_VALUES)
          ),
          buildingPeriods: fc.array(fc.constantFrom(...BUILDING_PERIOD_VALUES)),
          vacancyYears: fc.array(fc.constantFrom(...VACANCY_YEAR_VALUES)),
          isTaxedValues: fc.array(fc.boolean()),
          ownershipKinds: fc.array(fc.constantFrom(...OWNERSHIP_KIND_VALUES)),
          housingCounts: fc.array(
            fc.constantFrom(...HOUSING_BY_BUILDING_VALUES)
          ),
          vacancyRates: fc.array(fc.constantFrom(...VACANCY_RATE_VALUES)),
          intercommunalities: fc.array(fc.uuid({ version: 4 })),
          localities: fc.array(fc.string({ minLength: 5, maxLength: 5 })),
          localityKinds: fc.array(fc.constantFrom(...LOCALITY_KIND_VALUES)),
          geoPerimetersIncluded: fc.array(fc.string({ minLength: 1 })),
          geoPerimetersExcluded: fc.array(fc.string({ minLength: 1 })),
          dataFileYearsIncluded: fc.array(
            fc.constantFrom(...DATA_FILE_YEAR_VALUES)
          ),
          dataFileYearsExcluded: fc.array(
            fc.constantFrom(...DATA_FILE_YEAR_VALUES)
          ),
          status: fc.constantFrom(...HOUSING_STATUS_VALUES),
          statusList: fc.array(fc.constantFrom(...HOUSING_STATUS_VALUES)),
          subStatus: fc.array(fc.string({ minLength: 1 })),
          query: fc.string()
        })
      })
    })('should validate the campaign creation payload', async (payload) => {
      const { status } = await request(app)
        .post(testRoute)
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).not.toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    async function createPayload() {
      const housings: ReadonlyArray<HousingApi> = faker.helpers.multiple(() =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      const payload: CampaignCreationPayloadDTO = {
        title: 'Logements prioritaires',
        description: 'Logements ayant un potentiel de rénovation',
        housing: {
          filters: {},
          all: false,
          ids: housings.map((housing) => housing.id)
        }
      };
      return payload;
    }

    it('should create a new campaign', async () => {
      const payload = await createPayload();

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<CampaignDTO>({
        id: expect.any(String),
        title: payload.title,
        description: payload.description,
        status: 'draft',
        filters: {
          ...payload.housing.filters,
          establishmentIds: [establishment.id]
        },
        createdAt: expect.any(String)
      });
      const campaign = await Campaigns().where({ id: body.id }).first();
      expect(campaign).not.toBeNull();
    });

    it('should attach housings to this campaign', async () => {
      const payload = await createPayload();

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const campaignHousing = await CampaignsHousing().where({
        campaign_id: body.id
      });
      expect(campaignHousing).toIncludeAllPartialMembers(
        payload.housing.ids.map((id) => ({ housing_id: id }))
      );
    });

    it('should create an event for each attached housing', async () => {
      const payload = await createPayload();

      const { body, status } = await request(app)
        .post(testRoute)
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const events = await Events()
        .join(CAMPAIGN_HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({ campaign_id: body.id, type: 'housing:campaign-attached' });
      expect(events).toIncludeAllPartialMembers(
        payload.housing.ids.map((id) => ({ housing_id: id }))
      );
    });
  });

  describe('POST /campaigns/{id}/groups', () => {
    const testRoute = (id: string) => `/api/campaigns/${id}/groups`;

    const geoCode = oneOf(establishment.geoCodes);
    const group = genGroupApi(user, establishment);
    const groupHousing = [
      genHousingApi(geoCode),
      genHousingApi(geoCode),
      genHousingApi(geoCode)
    ];
    const owners = groupHousing
      .map((housing) => housing.owner)
      .filter(isDefined);

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(groupHousing.map(formatHousingRecordApi));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(groupHousing.map(formatOwnerHousingApi));
      await GroupsHousing().insert(formatGroupHousingApi(group, groupHousing));
    });

    it('should throw if the group is missing', async () => {
      const { status } = await request(app)
        .post(testRoute(uuidv4()))
        .send({
          title: 'Campagne prioritaire'
        })
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should throw if the group has been archived', async () => {
      const group: GroupApi = {
        ...genGroupApi(user, establishment),
        archivedAt: new Date()
      };
      await Groups().insert(formatGroupApi(group));

      const { status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Campagne prioritaire'
        })
        .set({
          'Content-Type': 'application/json'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create the campaign', async () => {
      const { body, status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Logements prioritaires',
          description: 'description',
          groupId: group.id
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<CampaignDTO>({
        id: expect.any(String),
        groupId: group.id,
        title: 'Logements prioritaires',
        description: 'description',
        status: 'draft',
        filters: {
          groupIds: [group.id]
        },
        createdAt: expect.toBeDateString()
      });
    });

    it("should add the group's housing to this campaign", async () => {
      const { body, status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Logements prioritaires'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const campaignHousing = await CampaignsHousing().where(
        'campaign_id',
        body.id
      );
      expect(campaignHousing).toBeArrayOfSize(groupHousing.length);
      expect(campaignHousing).toIncludeAllPartialMembers(
        groupHousing.map((housing) => ({ housing_id: housing.id }))
      );
    });

    it('should create an event for each attached housing', async () => {
      const { body, status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Logements prioritaires'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const events = await Events()
        .join(CAMPAIGN_HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          campaign_id: body.id,
          type: 'housing:campaign-attached'
        });
      expect(events).toBeArrayOfSize(groupHousing.length);
      expect(events).toIncludeAllPartialMembers(
        groupHousing.map((housing) => ({
          housing_id: housing.id,
          type: 'housing:campaign-attached'
        }))
      );
    });
  });

  describe('PUT /campaigns/{id}', () => {
    const testRoute = (id: string) => `/api/campaigns/${id}`;

    const defaultPayload: CampaignUpdatePayloadDTO = {
      title: 'New title',
      description: '',
      status: 'sending'
    };

    async function createCampaign(status: CampaignStatus) {
      const campaign: CampaignApi = {
        ...genCampaignApi(establishment.id, user.id),
        status: status
      };
      await Campaigns().insert(formatCampaignApi(campaign));
      const sender = genSenderApi(establishment);
      await Senders().insert(formatSenderApi(sender));
      const draft = genDraftApi(establishment, sender);
      await Drafts().insert(formatDraftApi(draft));
      await CampaignsDrafts().insert({
        campaign_id: campaign.id,
        draft_id: draft.id
      });
      const housings = faker.helpers.multiple(() => genHousingApi());
      await Housing().insert(housings.map(formatHousingRecordApi));
      return campaign;
    }

    it('should be forbidden for a non-authenticated user', async () => {
      const campaign = await createCampaign('draft');

      const { status } = await request(app).put(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      await request(app)
        .put(testRoute(randomstring.generate()))
        .send(defaultPayload)
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(uuidv4()))
        .send(defaultPayload)
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received a valid request', async () => {
      const campaign = await createCampaign('draft');

      async function fail(payload?: Record<string, unknown>): Promise<void> {
        const { status } = await request(app)
          .put(testRoute(campaign.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      }

      await fail();
      await fail({ title: defaultPayload.title });
      await fail({ status: defaultPayload.status });
      await fail({ ...defaultPayload, title: '' });
      await fail({ ...defaultPayload, title: 42 });
      await fail({ ...defaultPayload, status: '' });
      await fail({ ...defaultPayload, status: 'invalid' });
      await fail({ ...defaultPayload, status: 42 });
    });

    it('should update the campaign', async () => {
      const campaign = await createCampaign('draft');
      const payload: CampaignUpdatePayloadDTO = {
        status: campaign.status,
        title: faker.lorem.word(),
        description: faker.lorem.words()
      };

      const { body, status } = await request(app)
        .put(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const expected = {
        id: campaign.id,
        status: campaign.status,
        title: payload.title,
        description: payload.description
      };
      expect(body).toMatchObject(expected);

      const actual = await Campaigns().where({ id: campaign.id }).first();
      expect(actual).toMatchObject(expected);
    });

    it('should create an event when the campaign changes', async () => {
      const campaign = await createCampaign('draft');
      const payload: CampaignUpdatePayloadDTO = {
        status: 'sending',
        title: faker.lorem.word(),
        description: faker.lorem.words()
      };

      const { body, status } = await request(app)
        .put(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      const event = await Events()
        .join(CAMPAIGN_EVENTS_TABLE, 'event_id', 'id')
        .where({
          type: 'campaign:updated',
          campaign_id: body.id
        })
        .first();
      expect(event).toMatchObject<Partial<EventDBO<'campaign:updated'>>>({
        type: 'campaign:updated',
        next_old: {
          status: campaign.status,
          title: campaign.title,
          description: campaign.description
        },
        next_new: {
          status: payload.status,
          title: payload.title,
          description: payload.description
        }
      });
    });

    describe('Validate the campaign', () => {
      it('should set the status from "draft" to "sending"', async () => {
        const campaign = await createCampaign('draft');
        const payload: CampaignUpdatePayloadDTO = {
          status: 'sending',
          title: campaign.title,
          description: campaign.description
        };

        const { body, status } = await request(app)
          .put(testRoute(campaign.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject<Partial<CampaignDTO>>({
          id: campaign.id,
          title: campaign.title,
          description: campaign.description,
          status: 'sending',
          validatedAt: expect.any(String)
        });
      });
    });

    describe('Send the campaign', () => {
      it('should set the status from "sending" to "in-progress"', async () => {
        const campaign = await createCampaign('sending');
        const payload: CampaignUpdatePayloadDTO = {
          status: 'in-progress',
          sentAt: faker.date.recent().toJSON(),
          title: campaign.title,
          description: campaign.description
        };

        const { body, status } = await request(app)
          .put(testRoute(campaign.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject<Partial<CampaignDTO>>({
          id: campaign.id,
          title: campaign.title,
          status: payload.status,
          sentAt: payload.sentAt,
          confirmedAt: expect.any(String)
        });
      });

      it('should set contacted houses’ status to "waiting"', async () => {
        const campaign = await createCampaign('sending');

        const housings = await Housing()
          .join(campaignsHousingTable, (join) => {
            join.on('housing_geo_code', 'geo_code').andOn('housing_id', 'id');
          })
          .where({
            campaign_id: campaign.id
          });
        expect(housings.length).toBeGreaterThan(0);
        expect(housings).toSatisfyAll(
          (housing) => housing.status === HousingStatus.WAITING
        );
      });
    });

    describe('Archive the campaign', () => {
      it('should set the status from "in-progress" to "archived"', async () => {
        const campaign = await createCampaign('in-progress');
        const payload: CampaignUpdatePayloadDTO = {
          title: campaign.title,
          status: 'archived',
          description: ''
        };

        const { body, status } = await request(app)
          .put(testRoute(campaign.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        expect(body).toMatchObject<Partial<CampaignDTO>>({
          id: campaign.id,
          title: campaign.title,
          status: payload.status,
          archivedAt: expect.any(String)
        });
      });

      it('should create housing events when their status changes', async () => {
        const campaign = await createCampaign('in-progress');
        const payload: CampaignUpdatePayloadDTO = {
          title: campaign.title,
          status: 'archived',
          description: ''
        };

        const { status } = await request(app)
          .put(testRoute(campaign.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        const events = await Events()
          .join(CAMPAIGN_HOUSING_EVENTS_TABLE, 'event_id', 'id')
          .where({
            campaign_id: campaign.id,
            type: 'housing:status-updated'
          });
        events.forEach((event) => {
          expect(event).toMatchObject<
            Partial<EventDBO<'housing:status-updated'>>
          >({
            type: 'housing:status-updated',
            next_new: {
              status: 'waiting',
              subStatus: null
            }
          });
        });
      });
    });
  });

  describe('DELETE /campaigns/{id}', () => {
    const testRoute = (id: string) => `/api/campaigns/${id}`;

    let campaign: CampaignApi;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).delete(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      const { status } = await request(app)
        .delete(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should fail if the campaign is missing', async () => {
      const { status } = await request(app)
        .delete(testRoute(uuidv4()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should remove the campaign', async () => {
      const { status } = await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const actual = await Campaigns().where({ id: campaign.id }).first();
      expect(actual).toBeUndefined();
    });

    it('should remove the associated campaign events', async () => {
      const event: CampaignEventApi = {
        ...genEventApi({
          creator: user,
          type: 'campaign:updated',
          nextOld: { title: 'Before' },
          nextNew: { title: 'After' }
        }),
        campaignId: campaign.id
      };
      await Events().insert(formatEventApi(event));
      await CampaignEvents().insert(formatCampaignEventApi(event));

      const { status } = await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const actualEvent = await Events().where({ id: event.id }).first();
      expect(actualEvent).toBeUndefined();
      const actualCampaignEvent = await CampaignEvents().where({
        campaign_id: campaign.id,
        event_id: event.id
      });
      expect(actualCampaignEvent).toBeArrayOfSize(0);
    });

    it('should unlink the associated housings', async () => {
      const housings: HousingApi[] = faker.helpers.multiple(() =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      const campaignHousings = formatCampaignHousingApi(campaign, housings);
      await CampaignsHousing().insert(campaignHousings);

      await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const actualCampaignHouses = await CampaignsHousing().where({
        campaign_id: campaign.id
      });
      expect(actualCampaignHouses).toBeArrayOfSize(0);
    });

    it('should set the status to "never contacted" for each housing that has a status "waiting" and has no other campaign', async () => {
      const housing: HousingApi = {
        ...genHousingApi(oneOf(establishment.geoCodes)),
        status: HousingStatus.WAITING
      };
      await Housing().insert(formatHousingRecordApi(housing));
      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      });

      await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const actualHousing = await Housing()
        .where({
          geo_code: housing.geoCode,
          id: housing.id
        })
        .first();
      expect(actualHousing).toMatchObject({
        geo_code: housing.geoCode,
        id: housing.id,
        status: HousingStatus.NEVER_CONTACTED,
        sub_status: null
      });
    });

    it('should create an event "housing:campaign-removed" for each housing', async () => {
      const housings: HousingApi[] = faker.helpers.multiple(() =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );
      await Housing().insert(housings.map(formatHousingRecordApi));
      const campaignHousings: CampaignHousingDBO[] = formatCampaignHousingApi(
        campaign,
        housings
      );
      await CampaignsHousing().insert(campaignHousings);

      await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const events = await Events()
        .join(CAMPAIGN_HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          type: 'housing:campaign-removed',
          campaign_id: null
        })
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          housings.map((housing) => [housing.geoCode, housing.id])
        );
      expect(events).toBeArrayOfSize(housings.length);
    });

    it('should create an event "housing:status-updated" for each housing that has a status "waiting" and has no other campaign', async () => {
      const housings: HousingApi[] = faker.helpers.multiple(() => ({
        ...genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
        status: HousingStatus.WAITING
      }));
      await Housing().insert(housings.map(formatHousingRecordApi));
      const campaignHousings: CampaignHousingDBO[] = formatCampaignHousingApi(
        campaign,
        housings
      );
      await CampaignsHousing().insert(campaignHousings);

      await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const events = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          type: 'housing:status-updated'
        })
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          housings.map((housing) => [housing.geoCode, housing.id])
        );
      expect(events).toBeArrayOfSize(housings.length);
    });
  });

  describe('DELETE /campaigns/{id}/housing', () => {
    const testRoute = (id: string) => `/api/campaigns/${id}/housing`;

    let campaign: CampaignApi;
    let housings: HousingApi[];

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));

      housings = faker.helpers.multiple(() =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );
      await Housing().insert(housings.map(formatHousingRecordApi));

      const campaignHousings = formatCampaignHousingApi(campaign, housings);
      await CampaignsHousing().insert(campaignHousings);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).delete(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if the campaign is missing', async () => {
      const payload: CampaignRemovalPayloadDTO = {
        all: true,
        ids: [],
        filters: {}
      };

      const { status } = await request(app)
        .delete(testRoute(uuidv4()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it.todo('should fail if the campaign does not belong to the user');

    it('should unlink the associated housings', async () => {
      const payload = {
        all: false,
        ids: housings.map((housing) => housing.id)
      };

      const { status } = await request(app)
        .delete(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actualCampaignHousings = await CampaignsHousing().where({
        campaign_id: campaign.id
      });
      expect(actualCampaignHousings).toBeArrayOfSize(0);
    });

    it('should create an event "housing:campaign-detached" for each housing', async () => {
      const payload = {
        all: false,
        ids: housings.map((housing) => housing.id)
      };

      const { status } = await request(app)
        .delete(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const events = await Events()
        .join(CAMPAIGN_HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          type: 'housing:campaign-detached',
          campaign_id: campaign.id
        });

      expect(events).toBeArrayOfSize(housings.length);
      expect(events).toIncludeAllPartialMembers(
        housings.map((housing) => ({ housing_id: housing.id }))
      );
    });
  });
});
