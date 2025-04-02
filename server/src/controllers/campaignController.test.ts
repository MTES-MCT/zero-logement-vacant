import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/jest';
import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  CAMPAIGN_COUNT_VALUES,
  CampaignCreationPayloadDTO,
  CampaignDTO,
  CampaignUpdatePayloadDTO,
  DATA_FILE_YEAR_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  HOUSING_BY_BUILDING_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
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

import { isDefined, wait } from '@zerologementvacant/utils';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from '~/infra/server';
import { CampaignApi } from '~/models/CampaignApi';
import { DraftApi } from '~/models/DraftApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { CampaignsDrafts } from '~/repositories/campaignDraftRepository';
import {
  CampaignHousingDBO,
  CampaignsHousing
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
import { CampaignEvents, HousingEvents } from '~/repositories/eventRepository';
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

    it('should create a new campaign', async () => {
      const title = randomstring.generate();
      const description = randomstring.generate();
      const houses: HousingApi[] = Array.from({ length: 2 }).map(() =>
        genHousingApi(oneOf(establishment.geoCodes))
      );
      await Housing().insert(houses.map(formatHousingRecordApi));
      const payload: CampaignCreationPayloadDTO = {
        title,
        description,
        housing: {
          filters: {},
          all: false,
          ids: houses.map((housing) => housing.id)
        }
      };

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

      const actualCampaign = await Campaigns()
        .where({
          title,
          establishment_id: establishment.id
        })
        .first();
      expect(actualCampaign).toMatchObject({
        title
      });

      const actualCampaignHouses = await CampaignsHousing().whereIn(
        'housing_id',
        houses.map((housing) => housing.id)
      );
      expect(actualCampaignHouses).toBeArrayOfSize(houses.length);
      expect(actualCampaignHouses).toSatisfyAll((actual) => {
        return actual.campaign_id === actualCampaign?.id;
      });
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
      expect(body).toStrictEqual<CampaignApi>({
        id: expect.any(String),
        groupId: group.id,
        title: 'Logements prioritaires',
        description: 'description',
        status: 'draft',
        establishmentId: establishment.id,
        filters: {
          groupIds: [group.id]
        },
        createdAt: expect.toBeDateString(),
        userId: user.id
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
      expect(campaignHousing).toIncludeAllPartialMembers(
        groupHousing.map((housing) => ({ housing_id: housing.id }))
      );
    });

    it('should create campaign events', async () => {
      const { status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Logements prioritaires'
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      await wait(1000);

      const housingIds = groupHousing.map((housing) => housing.id);
      const housingEvents = await HousingEvents().whereIn(
        'housing_id',
        housingIds
      );
      expect(housingEvents.length).toBeGreaterThanOrEqual(groupHousing.length);
    });
  });

  describe('PUT /campaigns/{id}', () => {
    const testRoute = (id: string) => `/api/campaigns/${id}`;
    const payload: CampaignUpdatePayloadDTO = {
      title: 'New title',
      description: '',
      status: 'sending'
    };

    let campaign: CampaignApi;
    let draft: DraftApi;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      const sender = genSenderApi(establishment);
      await Senders().insert(formatSenderApi(sender));
      draft = genDraftApi(establishment, sender);
      await Drafts().insert(formatDraftApi(draft));
      await CampaignsDrafts().insert({
        campaign_id: campaign.id,
        draft_id: draft.id
      });
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).put(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      await request(app)
        .put(testRoute(randomstring.generate()))
        .send(payload)
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(uuidv4()))
        .send(payload)
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received a valid request', async () => {
      async function fail(payload?: Record<string, unknown>): Promise<void> {
        const { status } = await request(app)
          .put(testRoute(campaign.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
      }

      await fail();
      await fail({ title: payload.title });
      await fail({ status: payload.status });
      await fail({ ...payload, title: '' });
      await fail({ ...payload, title: 42 });
      await fail({ ...payload, status: '' });
      await fail({ ...payload, status: 'invalid' });
      await fail({ ...payload, status: 42 });
    });

    it('should update the campaign title', async () => {
      const payload: CampaignUpdatePayloadDTO = {
        status: campaign.status,
        title: 'New title',
        description: ''
      };

      const { body, status } = await request(app)
        .put(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: campaign.id,
        status: campaign.status,
        title: payload.title
      });

      const actual = await Campaigns().where({ id: campaign.id }).first();
      expect(actual).toMatchObject({
        id: campaign.id,
        status: campaign.status,
        title: payload.title
      });
    });

    it.todo('should create a campaign event when its status changes');

    describe('Validate the campaign', () => {
      it('should set the status from "draft" to "sending"', async () => {
        const payload: CampaignUpdatePayloadDTO = {
          title: campaign.title,
          status: 'sending',
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
          status: 'sending',
          validatedAt: expect.any(String)
        });
      });

      it('should fail if the draft is missing', async () => {
        const campaignWithoutDraft = genCampaignApi(establishment.id, user.id);
        const payload: CampaignUpdatePayloadDTO = {
          title: campaignWithoutDraft.title,
          status: 'sending',
          description: ''
        };

        const { status } = await request(app)
          .put(testRoute(campaignWithoutDraft.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
      });
    });

    describe('Send the campaign', () => {
      it('should set the status from "sending" to "in-progress"', async () => {
        campaign = { ...campaign, status: 'sending' };
        await Campaigns().where({ id: campaign.id }).update({
          status: campaign.status
        });
        const payload: CampaignUpdatePayloadDTO = {
          title: campaign.title,
          status: 'in-progress',
          sentAt: faker.date.recent().toJSON(),
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
          sentAt: payload.sentAt,
          confirmedAt: expect.any(String)
        });
      });

      it.todo('should set contacted houses’ status to "waiting"');
    });

    describe('Archive the campaign', () => {
      it('should set the status from "in-progress" to "archived"', async () => {
        campaign = { ...campaign, status: 'in-progress' };
        await Campaigns().where({ id: campaign.id }).update({
          status: campaign.status
        });
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

      it.todo('should create housing events when their status changes');
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

    it('should remove the campaign', async () => {
      const { status } = await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const actualCampaign = await Campaigns().where({
        establishment_id: establishment.id,
        id: campaign.id
      });
      expect(actualCampaign).toStrictEqual([]);
    });

    it('should delete linked events and campaign housing', async () => {
      const houses: HousingApi[] = Array.from({ length: 2 }).map(() =>
        genHousingApi(oneOf(establishment.geoCodes))
      );
      await Housing().insert(houses.map(formatHousingRecordApi));
      const campaignHouses: CampaignHousingDBO[] = houses.map((housing) => ({
        campaign_id: campaign.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      }));
      await CampaignsHousing().insert(campaignHouses);

      await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const actualCampaignHouses = await CampaignsHousing().where({
        campaign_id: campaign.id
      });
      expect(actualCampaignHouses).toBeArrayOfSize(0);

      const actualCampaignEvents = await CampaignEvents().where({
        campaign_id: campaign.id
      });
      expect(actualCampaignEvents).toBeArrayOfSize(0);
    });

    it('should set status never contacted for waiting housing without anymore campaigns', async () => {
      const housing: HousingApi = {
        ...genHousingApi(oneOf(establishment.geoCodes)),
        status: HousingStatusApi.Waiting
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
        status: HousingStatusApi.NeverContacted,
        sub_status: null
      });
    });
  });
});
