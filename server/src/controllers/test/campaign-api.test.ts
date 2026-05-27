import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import {
  CampaignDTO,
  CampaignRemovalPayload,
  CampaignUpdatePayload,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  type CampaignCreationPayload,
  type UserDTO
} from '@zerologementvacant/models';
import { isDefined } from '@zerologementvacant/utils';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import createServerFactories from '~/test/factories';
import { createServer } from '~/infra/server';
import { CampaignApi } from '~/models/CampaignApi';
import { CampaignEventApi } from '~/models/EventApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import {
  CampaignHousingDBO,
  CampaignsHousing,
  formatCampaignHousingApi
} from '~/repositories/campaignHousingRepository';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  CAMPAIGN_HOUSING_EVENTS_TABLE,
  CampaignEvents,
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
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing,
  type HousingRecordDBO
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { knexAdapter } from '~/test/knex-adapter';
import {
  genCampaignApi,
  genCampaignApiNext,
  genEstablishmentApi,
  genEventApi,
  genGroupApi,
  genHousingApi,
  genHousingOwnerApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Campaign API', () => {
  const factories = createServerFactories(knexAdapter);

  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  describe('GET /campaigns', () => {
    const testRoute = '/campaigns';

    const campaigns: CampaignApi[] = Array.from({ length: 3 }).map(() =>
      genCampaignApi(establishment.id, user)
    );

    beforeAll(async () => {
      await Campaigns().insert(campaigns.map(formatCampaignApi));
    });

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(url).get(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should list campaigns', async () => {
      const { body, status } = await request(url)
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
        return genCampaignApi(establishment.id, user, group);
      });
      await Campaigns().insert(campaigns.map(formatCampaignApi));
      const query = 'groups=' + groups.map((group) => group.id).join(',');

      const { body, status } = await request(url)
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

    describe('sorting', () => {
      let sortCampaigns: CampaignApi[];

      beforeEach(async () => {
        sortCampaigns = Array.from({ length: 3 }).map(() =>
          genCampaignApi(establishment.id, user)
        );
        await Campaigns().insert(sortCampaigns.map(formatCampaignApi));
        await Promise.all([
          Campaigns()
            .where({ id: sortCampaigns[0].id })
            .update({ housing_count: 10, owner_count: 5, return_count: 1 }),
          Campaigns()
            .where({ id: sortCampaigns[1].id })
            .update({ housing_count: 20, owner_count: 3, return_count: 4 }),
          Campaigns()
            .where({ id: sortCampaigns[2].id })
            .update({ housing_count: 5, owner_count: 8, return_count: 2 })
        ]);
      });

      afterEach(async () => {
        if (sortCampaigns?.length) {
          await Campaigns()
            .whereIn(
              'id',
              sortCampaigns.map((c) => c.id)
            )
            .delete();
        }
      });

      it('should sort by housingCount ascending', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query('sort=housingCount')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        const ids = body.map((c: CampaignDTO) => c.id);
        expect(
          ids.filter((id: string) => sortCampaigns.some((c) => c.id === id))
        ).toEqual([
          sortCampaigns[2].id, // housing_count: 5
          sortCampaigns[0].id, // housing_count: 10
          sortCampaigns[1].id // housing_count: 20
        ]);
      });

      it('should sort by ownerCount descending', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query('sort=-ownerCount')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        const ids = body.map((c: CampaignDTO) => c.id);
        expect(
          ids.filter((id: string) => sortCampaigns.some((c) => c.id === id))
        ).toEqual([
          sortCampaigns[2].id, // owner_count: 8
          sortCampaigns[0].id, // owner_count: 5
          sortCampaigns[1].id // owner_count: 3
        ]);
      });

      it('should sort by returnCount ascending', async () => {
        const { body, status } = await request(url)
          .get(testRoute)
          .query('sort=returnCount')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        const ids = body.map((c: CampaignDTO) => c.id);
        expect(
          ids.filter((id: string) => sortCampaigns.some((c) => c.id === id))
        ).toEqual([
          sortCampaigns[0].id, // return_count: 1
          sortCampaigns[2].id, // return_count: 2
          sortCampaigns[1].id // return_count: 4
        ]);
      });

      it('should sort by returnRate ascending', async () => {
        // return_rate = return_count / housing_count (GENERATED ALWAYS AS)
        // sortCampaigns[0]: 1/10 = 0.1
        // sortCampaigns[1]: 4/20 = 0.2
        // sortCampaigns[2]: 2/5  = 0.4
        const { body, status } = await request(url)
          .get(testRoute)
          .query('sort=returnRate')
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        const ids = body.map((c: CampaignDTO) => c.id);
        expect(
          ids.filter((id: string) => sortCampaigns.some((c) => c.id === id))
        ).toEqual([
          sortCampaigns[0].id, // 0.1
          sortCampaigns[1].id, // 0.2
          sortCampaigns[2].id // 0.4
        ]);
      });
    });
  });

  describe('GET /campaigns/{id}', () => {
    const group = genGroupApi(user, establishment);
    const campaign = genCampaignApiNext({
      group,
      creator: user,
      establishment
    });

    const testRoute = (id: string) => `/campaigns/${id}`;

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should be forbidden for a not authenticated user', async () => {
      const { status } = await request(url).get(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      const { status } = await request(url)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return an error when there is no campaign with the required id', async () => {
      const { status } = await request(url)
        .get(testRoute(uuidv4()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should return the campaign', async () => {
      const { body, status } = await request(url)
        .get(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject({
        id: campaign.id,
        filters: expect.objectContaining(campaign.filters)
      });
    });

    it('should return campaign fields', async () => {
      const { body, status } = await request(url)
        .get(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<CampaignDTO>>({
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        createdBy: expect.objectContaining<Partial<UserDTO>>({
          id: user.id
        }),
        sentAt: campaign.sentAt,
        returnCount: campaign.returnCount,
        groupId: campaign.groupId
      });
    });
  });

  describe('POST /groups/{id}/campaigns', () => {
    const testRoute = (id: string) => `/groups/${id}/campaigns`;

    const geoCode = faker.helpers.arrayElement(establishment.geoCodes);
    const group = genGroupApi(user, establishment);
    const groupHousings = HOUSING_STATUS_VALUES.flatMap((status) => {
      return faker.helpers.multiple(
        () => ({ ...genHousingApi(geoCode), status }),
        { count: 3 }
      );
    });
    const owners = groupHousings
      .map((housing) => housing.owner)
      .filter(isDefined);
    const housingOwners = groupHousings.map((housing) =>
      genHousingOwnerApi(housing, housing.owner!)
    );

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(groupHousings.map(formatHousingRecordApi));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));
      await GroupsHousing().insert(formatGroupHousingApi(group, groupHousings));
    });

    test.prop<CampaignCreationPayload>(
      {
        title: fc.stringMatching(/\S/),
        description: fc.stringMatching(/\S/),
        sentAt: fc.option(
          fc
            .date({
              min: new Date('0001-01-01'),
              max: new Date('9999-12-31'),
              noInvalidDate: true
            })
            .map((date) => date.toISOString().substring(0, 'yyyy-mm-dd'.length))
        )
      },
      { numRuns: 20 }
    )('should validate inputs', async (payload) => {
      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
    });

    it('should throw if the group is missing', async () => {
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };

      const { status } = await request(url)
        .post(testRoute(uuidv4()))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should throw if the group has been archived', async () => {
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };
      const group: GroupApi = {
        ...genGroupApi(user, establishment),
        archivedAt: new Date()
      };
      await Groups().insert(formatGroupApi(group));

      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should create the campaign', async () => {
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: faker.date.anytime().toISOString().slice(0, 'yyyy-mm-dd'.length)
      };

      const { body, status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      expect(body).toStrictEqual<CampaignDTO>({
        id: expect.any(String),
        groupId: group.id,
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        status: 'draft',
        filters: {
          groupIds: [group.id]
        },
        sentAt: payload.sentAt,
        createdAt: expect.any(String),
        createdBy: expect.objectContaining({ id: user.id }),
        returnCount: null,
        returnRate: null,
        housingCount: expect.any(Number),
        ownerCount: expect.any(Number)
      });
    });

    it("should add the group's housing to this campaign", async () => {
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };

      const { body, status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const campaignHousing = await CampaignsHousing().where(
        'campaign_id',
        body.id
      );
      expect(campaignHousing).toBeArrayOfSize(groupHousings.length);
      expect(campaignHousing).toIncludeAllPartialMembers(
        groupHousings.map((housing) => ({ housing_id: housing.id }))
      );
    });

    it('should create an event "housing:campaign-attached" for each attached housing', async () => {
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };

      const { body, status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const events = await Events()
        .join(CAMPAIGN_HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          campaign_id: body.id,
          type: 'housing:campaign-attached'
        });
      expect(events).toBeArrayOfSize(groupHousings.length);
      expect(events).toIncludeAllPartialMembers(
        groupHousings.map((housing) => ({
          housing_id: housing.id,
          type: 'housing:campaign-attached'
        }))
      );
    });

    it('should change each "never contacted" housing’ status to "waiting"', async () => {
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };

      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const neverContactedHousings = groupHousings.filter(
        (groupHousing) => groupHousing.status === HousingStatus.NEVER_CONTACTED
      );
      const actual = await Housing().whereIn(
        ['geo_code', 'id'],
        neverContactedHousings.map((housing) => [housing.geoCode, housing.id])
      );
      expect(actual).toSatisfyAll<HousingRecordDBO>(
        (housing) => housing.status === HousingStatus.WAITING
      );
    });

    it('should not change housings that are not "never contacted"', async () => {
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };

      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const notNeverContactedHousings = groupHousings.filter(
        (groupHousing) =>
          ![HousingStatus.NEVER_CONTACTED, HousingStatus.WAITING].includes(
            groupHousing.status
          )
      );
      const actual = await Housing().whereIn(
        ['geo_code', 'id'],
        notNeverContactedHousings.map((housing) => [
          housing.geoCode,
          housing.id
        ])
      );
      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<HousingRecordDBO>(
        (housing) => housing.status !== HousingStatus.WAITING
      );
    });

    it('should create an event "housing:status-updated" for each "never contacted" housing that became "waiting"', async () => {
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };

      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const events = await Events()
        .where({ type: 'housing:status-updated' })
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          groupHousings.map((groupHousing) => [
            groupHousing.geoCode,
            groupHousing.id
          ])
        );
      const neverContactedHousings = groupHousings.filter(
        (groupHousing) => groupHousing.status === HousingStatus.NEVER_CONTACTED
      );
      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBe(neverContactedHousings.length);
    });
  });

  describe('PUT /campaigns/{id}', () => {
    const testRoute = (id: string) => `/campaigns/${id}`;

    let campaign: CampaignApi;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).put(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should require a valid campaign id', async () => {
      const payload: CampaignUpdatePayload = {
        title: 'Title',
        description: 'Description',
        sentAt: null
      };

      const { status } = await request(url)
        .put(testRoute(randomstring.generate()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should return 404 when the campaign is missing', async () => {
      const payload: CampaignUpdatePayload = {
        title: 'Title',
        description: 'Description',
        sentAt: null
      };

      const { status } = await request(url)
        .put(testRoute(uuidv4()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    test.prop<CampaignUpdatePayload>(
      {
        title: fc.stringMatching(/S+/),
        description: fc.stringMatching(/S+/),
        sentAt: fc
          .date({
            min: new Date('0001-01-01'),
            max: new Date('9999-12-31'),
            noInvalidDate: true
          })
          .map((date) => date.toISOString().substring(0, 'yyyy-mm-dd'.length))
      },
      { numRuns: 20 }
    )('should accept valid inputs', async (payload) => {
      const { status } = await request(url)
        .put(testRoute(campaign.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
    });

    it('should update title, description, and sentAt', async () => {
      const payload: CampaignUpdatePayload = {
        title: faker.lorem.word(),
        description: faker.lorem.words(),
        sentAt: '2024-06-15'
      };

      const { body, status } = await request(url)
        .put(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).toMatchObject<Partial<CampaignDTO>>({
        id: campaign.id,
        title: payload.title,
        description: payload.description,
        sentAt: payload.sentAt
      });

      const actual = await Campaigns().where({ id: campaign.id }).first();
      expect(actual).toMatchObject({
        title: payload.title,
        description: payload.description
      });
    });

    it('should keep sentAt unchanged when null is sent and sentAt is unset', async () => {
      const payload: CampaignUpdatePayload = {
        title: faker.lorem.word(),
        description: faker.lorem.words(),
        sentAt: null
      };

      const { body, status } = await request(url)
        .put(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.sentAt).toBeNull();
    });

    it('should reject unsetting sentAt once it has been set', async () => {
      const campaignWithSentAt: CampaignApi = {
        ...genCampaignApi(establishment.id, user),
        sentAt: '2024-06-15'
      };
      await Campaigns().insert(formatCampaignApi(campaignWithSentAt));

      const payload: CampaignUpdatePayload = {
        title: campaignWithSentAt.title,
        description: campaignWithSentAt.description,
        sentAt: null
      };

      const { status } = await request(url)
        .put(testRoute(campaignWithSentAt.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });
  });

  describe('DELETE /campaigns/{id}', () => {
    const testRoute = (id: string) => `/campaigns/${id}`;

    let campaign: CampaignApi;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).delete(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      const { status } = await request(url)
        .delete(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should fail if the campaign is missing', async () => {
      const { status } = await request(url)
        .delete(testRoute(uuidv4()))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should fail if the campaign does not belong to the user’s establishment', async () => {
      const otherEstablishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(otherEstablishment));
      const otherUser = genUserApi(otherEstablishment.id);
      await Users().insert(toUserDBO(otherUser));

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(otherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should remove the campaign', async () => {
      const { status } = await request(url)
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

      const { status } = await request(url)
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

      await request(url)
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

      await request(url)
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

      await request(url)
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

      await request(url)
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

  describe('DELETE /campaigns/{id}/housings', () => {
    const testRoute = (id: string) => `/campaigns/${id}/housings`;

    let campaign: CampaignApi;
    let housings: HousingApi[];

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));

      housings = faker.helpers.multiple(() =>
        genHousingApi(faker.helpers.arrayElement(establishment.geoCodes))
      );
      await Housing().insert(housings.map(formatHousingRecordApi));

      const campaignHousings = formatCampaignHousingApi(campaign, housings);
      await CampaignsHousing().insert(campaignHousings);
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).delete(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should fail if the campaign is missing', async () => {
      const payload: CampaignRemovalPayload = {
        all: true,
        housingIds: []
      };

      const { status } = await request(url)
        .delete(testRoute(uuidv4()))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should fail if the campaign does not belong to the user’s establishment', async () => {
      const otherEstablishment = genEstablishmentApi();
      await Establishments().insert(formatEstablishmentApi(otherEstablishment));
      const otherUser = genUserApi(otherEstablishment.id);
      await Users().insert(toUserDBO(otherUser));

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .send({
          all: true,
          housingIds: []
        })
        .use(tokenProvider(otherUser));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should unlink the given housings', async () => {
      const shouldRemove = faker.helpers.arrayElement(housings);
      const shouldKeep = housings.filter(
        (housing) => housing.id !== shouldRemove.id
      );
      const payload: CampaignRemovalPayload = {
        all: false,
        housingIds: [shouldRemove.id]
      };

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const actualCampaignHousings = await CampaignsHousing().where({
        campaign_id: campaign.id
      });
      expect(actualCampaignHousings).toBeArrayOfSize(shouldKeep.length);
      expect(actualCampaignHousings).toIncludeAllPartialMembers(
        shouldKeep.map((housing) => ({ housing_id: housing.id }))
      );
    });

    it('should create an event "housing:campaign-detached"', async () => {
      const payload = {
        all: false,
        ids: housings.map((housing) => housing.id)
      };

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

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

    it(`should reset the status of housings that are ${HousingStatus.WAITING} and are in no campaign anymore`, async () => {
      const geoCode = faker.helpers.arrayElement(establishment.geoCodes);
      const mustReset = await factories.housing.create({
        status: HousingStatus.WAITING,
        geoCode
      });
      const mustNotReset = await Promise.all([
        factories.housing.create({ status: HousingStatus.WAITING, geoCode }),
        factories.housing.create({ status: HousingStatus.BLOCKED, geoCode })
      ]);
      const campaign = await factories.campaign
        .forEstablishment(establishment)
        .create({}, { associations: { createdBy: user } });
      const otherCampaign = await factories.campaign
        .forEstablishment(establishment)
        .create({}, { associations: { createdBy: user } });
      await CampaignsHousing().insert([
        {
          // Should be reset because in status "waiting"
          // and will not be in any campaign after the deletion
          campaign_id: campaign.id,
          housing_geo_code: mustReset.geoCode,
          housing_id: mustReset.id
        },
        {
          campaign_id: campaign.id,
          housing_geo_code: mustNotReset[0].geoCode,
          housing_id: mustNotReset[0].id
        },
        {
          // Should not be reset because still in another campaign
          campaign_id: otherCampaign.id,
          housing_geo_code: mustNotReset[0].geoCode,
          housing_id: mustNotReset[0].id
        },
        {
          // Should not be reset because not in status "waiting"
          campaign_id: campaign.id,
          housing_geo_code: mustNotReset[1].geoCode,
          housing_id: mustNotReset[1].id
        }
      ]);

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .send({
          all: false,
          housingIds: [mustReset, ...mustNotReset].map((housing) => housing.id)
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const actual = await Housing().whereIn(
        ['geo_code', 'id'],
        [mustReset, ...mustNotReset].map((housing) => [
          housing.geoCode,
          housing.id
        ])
      );
      expect(actual).toIncludeAllPartialMembers([
        {
          id: mustReset.id,
          status: HousingStatus.NEVER_CONTACTED
        },
        {
          id: mustNotReset[0].id,
          status: HousingStatus.WAITING
        },
        {
          id: mustNotReset[1].id,
          status: HousingStatus.BLOCKED
        }
      ]);
    });

    it('should create an event "housing:status-updated" if the housing should be reset', async () => {
      const geoCode = faker.helpers.arrayElement(establishment.geoCodes);
      const mustReset = await factories.housing.create({
        status: HousingStatus.WAITING,
        geoCode
      });
      const mustNotReset = await Promise.all([
        factories.housing.create({ status: HousingStatus.WAITING, geoCode }),
        factories.housing.create({ status: HousingStatus.BLOCKED, geoCode })
      ]);
      const campaign = await factories.campaign
        .forEstablishment(establishment)
        .create({}, { associations: { createdBy: user } });
      const otherCampaign = await factories.campaign
        .forEstablishment(establishment)
        .create({}, { associations: { createdBy: user } });
      await CampaignsHousing().insert([
        {
          // Should be reset because in status "waiting"
          // and will not be in any campaign after the deletion
          campaign_id: campaign.id,
          housing_geo_code: mustReset.geoCode,
          housing_id: mustReset.id
        },
        {
          campaign_id: campaign.id,
          housing_geo_code: mustNotReset[0].geoCode,
          housing_id: mustNotReset[0].id
        },
        {
          // Should not be reset because still in another campaign
          campaign_id: otherCampaign.id,
          housing_geo_code: mustNotReset[0].geoCode,
          housing_id: mustNotReset[0].id
        },
        {
          // Should not be reset because not in status "waiting"
          campaign_id: campaign.id,
          housing_geo_code: mustNotReset[1].geoCode,
          housing_id: mustNotReset[1].id
        }
      ]);
      const payload: CampaignRemovalPayload = {
        all: false,
        housingIds: [mustReset, ...mustNotReset].map((housing) => housing.id)
      };

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const event = await Events()
        .join(HOUSING_EVENTS_TABLE, 'event_id', 'id')
        .where({
          type: 'housing:status-updated'
        })
        .whereIn(
          ['housing_geo_code', 'housing_id'],
          [mustReset, ...mustNotReset].map((housing) => [
            housing.geoCode,
            housing.id
          ])
        )
        .first();
      expect(event).not.toBeNull();
    });
  });
});
