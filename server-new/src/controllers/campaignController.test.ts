import { wait } from '@hapi/hoek';
import { formatISO } from 'date-fns';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { isDefined } from '@zerologementvacant/shared';
import {
  CampaignHousingDBO,
  CampaignsHousing,
  campaignsHousingTable,
} from '~/repositories/campaignHousingRepository';
import {
  Campaigns,
  formatCampaignApi,
} from '~/repositories/campaignRepository';
import { tokenProvider } from '~/test/testUtils';
import { Campaign1 } from '~/infra/database/seeds/test/20240405012855_campaigns';
import { CampaignEvents, HousingEvents } from '~/repositories/eventRepository';
import { CampaignApi, CampaignSteps } from '~/models/CampaignApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import {
  formatHousingRecordApi,
  Housing,
  housingTable,
} from '~/repositories/housingRepository';
import { createServer } from '~/infra/server';
import {
  formatGroupApi,
  formatGroupHousingApi,
  Groups,
  GroupsHousing,
} from '~/repositories/groupRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genNumber,
  genUserApi,
  oneOf,
} from '~/test/testFixtures';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import {
  formatOwnerHousingApi,
  HousingOwners,
} from '~/repositories/housingOwnerRepository';
import {
  Establishments,
  formatEstablishmentApi,
} from '~/repositories/establishmentRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import { HousingApi } from '~/models/HousingApi';
import { GroupApi } from '~/models/GroupApi';

describe('Campaign controller', () => {
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
      await request(app)
        .get(testRoute(uuidv4()))
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the campaign', async () => {
      const { body, status } = await request(app)
        .get(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: campaign.id,
        filters: expect.objectContaining(campaign.filters),
      });
    });
  });

  describe('GET /campaigns', () => {
    const testRoute = '/api/campaigns';

    const campaigns: CampaignApi[] = Array.from({ length: 3 }).map(() =>
      genCampaignApi(establishment.id, user.id),
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
            id: campaign.id,
          };
        }),
      );
    });

    it('should filter by group', async () => {
      const groups = Array.from({ length: 2 }).map(() =>
        genGroupApi(user, establishment),
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
            groupId: campaign.groupId,
          };
        }),
      );
    });
  });

  describe('POST /campaigns', () => {
    const testRoute = '/api/campaigns';

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(app).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should create a new campaign', async () => {
      const title = randomstring.generate();
      const houses: HousingApi[] = Array.from({ length: 2 }).map(() =>
        genHousingApi(oneOf(establishment.geoCodes)),
      );
      await Housing().insert(houses.map(formatHousingRecordApi));

      const { body, status } = await request(app)
        .post(testRoute)
        .send({
          draftCampaign: {
            filters: {},
            title,
          },
          housingIds: houses.map((housing) => housing.id),
          allHousing: false,
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toMatchObject({
        title,
      });

      const actualCampaign = await Campaigns()
        .where({
          title,
          establishment_id: establishment.id,
        })
        .first();
      expect(actualCampaign).toMatchObject({
        title,
      });

      const actualCampaignHouses = await CampaignsHousing().whereIn(
        'housing_id',
        houses.map((housing) => housing.id),
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
      genHousingApi(geoCode),
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
          title: 'Campagne prioritaire',
        })
        .set({
          'Content-Type': 'application/json',
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should throw if the group has been archived', async () => {
      const group: GroupApi = {
        ...genGroupApi(user, establishment),
        archivedAt: new Date(),
      };
      await Groups().insert(formatGroupApi(group));

      const { status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Campagne prioritaire',
        })
        .set({
          'Content-Type': 'application/json',
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create the campaign', async () => {
      const { body, status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Logements prioritaires',
          groupId: group.id,
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<CampaignApi>({
        id: expect.any(String),
        groupId: group.id,
        title: 'Logements prioritaires',
        establishmentId: establishment.id,
        filters: {
          groupIds: [group.id],
        },
        createdAt: expect.toBeDateString(),
        createdBy: user.id,
        validatedAt: expect.toBeDateString(),
      });
    });

    it("should add the group's housing to this campaign", async () => {
      const { body, status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Logements prioritaires',
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const campaignHousing = await CampaignsHousing().where(
        'campaign_id',
        body.id,
      );
      expect(campaignHousing).toIncludeAllPartialMembers(
        groupHousing.map((housing) => ({ housing_id: housing.id })),
      );
    });

    it('should create campaign events', async () => {
      const { status } = await request(app)
        .post(testRoute(group.id))
        .send({
          title: 'Logements prioritaires',
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      await wait(1000);

      const housingIds = groupHousing.map((housing) => housing.id);
      const housingEvents = await HousingEvents().whereIn(
        'housing_id',
        housingIds,
      );
      expect(housingEvents.length).toBeGreaterThanOrEqual(groupHousing.length);
    });
  });

  describe('PUT /campaigns/{id}', () => {
    const testRoute = (id: string) => `/api/campaigns/${id}`;

    let campaign: CampaignApi;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(app).put(testRoute(Campaign1.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      await request(app)
        .put(testRoute(randomstring.generate()))
        .send({ stepUpdate: { step: CampaignSteps.OwnersValidation } })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(app)
        .put(testRoute(uuidv4()))
        .send({ stepUpdate: { step: CampaignSteps.OwnersValidation } })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received a valid request', async () => {
      const badRequestTest = async (payload?: Record<string, unknown>) => {
        await request(app)
          .put(testRoute(Campaign1.id))
          .send(payload)
          .use(tokenProvider(user))
          .expect(constants.HTTP_STATUS_BAD_REQUEST);
      };

      await badRequestTest({
        titleUpdate: {},
      });
      await badRequestTest({
        titleUpdate: {
          title: genNumber(),
        },
      });
      await badRequestTest({
        stepUpdate: {},
      });
      await badRequestTest({
        stepUpdate: {
          step: 15,
        },
      });
      await badRequestTest({
        stepUpdate: {
          step: CampaignSteps.Sending,
        },
      });
      await badRequestTest({
        stepUpdate: {
          step: CampaignSteps.Sending,
          sendingDate: randomstring.generate(),
        },
      });
    });

    it('should update the campaign title', async () => {
      const newTitle = randomstring.generate();
      const { body, status } = await request(app)
        .put(testRoute(campaign.id))
        .send({
          titleUpdate: {
            title: newTitle,
          },
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: campaign.id,
        title: newTitle,
      });

      const actual = await Campaigns().where({ id: campaign.id }).first();
      expect(actual).toMatchObject({
        id: campaign.id,
        title: newTitle,
      });
    });

    it('should update the campaign when validating step OwnersValidation', async () => {
      const { body, status } = await request(app)
        .put(testRoute(campaign.id))
        .send({
          stepUpdate: {
            step: CampaignSteps.OwnersValidation,
          },
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: campaign.id,
        validatedAt: expect.any(String),
      });
    });

    it('should update the campaign when validating step Export', async () => {
      const { status } = await request(app)
        .put(testRoute(campaign.id))
        .send({
          stepUpdate: {
            step: CampaignSteps.Export,
          },
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actualCampaign = await Campaigns().where('id', campaign.id).first();
      expect(actualCampaign).toMatchObject({
        id: campaign.id,
        exported_at: expect.any(Date),
        sent_at: null,
      });
    });

    it('should update the campaign when validating step Sending and update housing status if needed', async () => {
      const houses: HousingApi[] = [
        {
          ...genHousingApi(oneOf(establishment.geoCodes)),
          status: HousingStatusApi.Waiting,
        },
        {
          ...genHousingApi(oneOf(establishment.geoCodes)),
          status: HousingStatusApi.NeverContacted,
        },
        {
          ...genHousingApi(oneOf(establishment.geoCodes)),
          status: HousingStatusApi.InProgress,
        },
      ];
      await Housing().insert(houses.map(formatHousingRecordApi));
      const campaignHouses: CampaignHousingDBO[] = houses.map((housing) => ({
        campaign_id: campaign.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
      }));
      await CampaignsHousing().insert(campaignHouses);

      const { status } = await request(app)
        .put(testRoute(campaign.id))
        .send({
          stepUpdate: {
            step: CampaignSteps.Sending,
            sendingDate: formatISO(new Date()),
          },
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);

      const actualCampaign = await Campaigns()
        .where({ id: campaign.id })
        .first();
      expect(actualCampaign).toMatchObject({
        id: campaign.id,
        sent_at: expect.any(Date),
        sending_date: expect.any(Date),
      });

      const actualHouses = await Housing()
        .select(`${housingTable}.*`)
        .join(campaignsHousingTable, (join) => {
          join
            .on(
              `${housingTable}.geo_code`,
              `${campaignsHousingTable}.housing_geo_code`,
            )
            .andOn(`${housingTable}.id`, `${campaignsHousingTable}.housing_id`);
        })
        .where(`${campaignsHousingTable}.campaign_id`, campaign.id);
      expect(actualHouses).toIncludeAllPartialMembers([
        {
          id: houses[0].id,
          status: HousingStatusApi.Waiting,
        },
        {
          id: houses[1].id,
          status: HousingStatusApi.Waiting,
        },
        {
          id: houses[2].id,
          status: HousingStatusApi.InProgress,
        },
      ]);
    });

    it('should update the campaign when validating step Confirmation', async () => {
      await request(app)
        .put(testRoute(campaign.id))
        .send({
          stepUpdate: {
            step: CampaignSteps.Confirmation,
          },
        })
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_OK);

      const actual = await Campaigns().where({ id: campaign.id }).first();
      expect(actual).toMatchObject({
        id: campaign.id,
        confirmed_at: expect.any(Date),
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

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(app).delete(testRoute(Campaign1.id));

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
        id: campaign.id,
      });
      expect(actualCampaign).toStrictEqual([]);
    });

    it('should delete linked events and campaign housing', async () => {
      const houses: HousingApi[] = Array.from({ length: 2 }).map(() =>
        genHousingApi(oneOf(establishment.geoCodes)),
      );
      await Housing().insert(houses.map(formatHousingRecordApi));
      const campaignHouses: CampaignHousingDBO[] = houses.map((housing) => ({
        campaign_id: campaign.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
      }));
      await CampaignsHousing().insert(campaignHouses);

      await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const actualCampaignHouses = await CampaignsHousing().where({
        campaign_id: campaign.id,
      });
      expect(actualCampaignHouses).toBeArrayOfSize(0);

      const actualCampaignEvents = await CampaignEvents().where({
        campaign_id: campaign.id,
      });
      expect(actualCampaignEvents).toBeArrayOfSize(0);
    });

    it('should set status never contacted for waiting housing without anymore campaigns', async () => {
      const housing: HousingApi = {
        ...genHousingApi(oneOf(establishment.geoCodes)),
        status: HousingStatusApi.Waiting,
      };
      await Housing().insert(formatHousingRecordApi(housing));
      await CampaignsHousing().insert({
        campaign_id: campaign.id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
      });

      await request(app)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const actualHousing = await Housing()
        .where({
          geo_code: housing.geoCode,
          id: housing.id,
        })
        .first();
      expect(actualHousing).toMatchObject({
        geo_code: housing.geoCode,
        id: housing.id,
        status: HousingStatusApi.NeverContacted,
        sub_status: null,
      });
    });
  });
});
