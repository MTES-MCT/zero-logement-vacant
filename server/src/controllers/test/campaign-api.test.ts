import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  CAMPAIGN_COUNT_VALUES,
  CAMPAIGN_STATUS_LABELS,
  CampaignCreationPayloadDTO,
  CampaignDTO,
  CampaignRemovalPayloadDTO,
  CampaignStatus,
  CampaignUpdatePayload,
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
  VACANCY_YEAR_VALUES,
  type CampaignCreationPayload,
  type UserDTO
} from '@zerologementvacant/models';
import { isDefined } from '@zerologementvacant/utils';
import { constants } from 'http2';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { vi } from 'vitest';

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
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
import {
  formatHousingRecordApi,
  Housing,
  type HousingRecordDBO
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import { formatSenderApi, Senders } from '~/repositories/senderRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import * as posthogService from '~/services/posthogService';
import {
  genCampaignApi,
  genCampaignApiNext,
  genDraftApi,
  genEstablishmentApi,
  genEventApi,
  genGroupApi,
  genHousingApi,
  genHousingOwnerApi,
  genSenderApi,
  genUserApi,
  oneOf
} from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Campaign API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /campaigns/{id}', () => {
    const group = genGroupApi(user, establishment);
    const campaign = genCampaignApiNext({
      group,
      creator: user,
      establishment
    });
    campaign.sentAt = faker.date
      .past()
      .toISOString()
      .slice(0, 'yyyy-mm-dd'.length);
    campaign.returnCount = 0;

    const testRoute = (id: string) => `/api/campaigns/${id}`;

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

  describe('GET /campaigns', () => {
    const testRoute = '/api/campaigns';

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
  });

  describe('POST /campaigns', () => {
    const testRoute = '/api/campaigns';

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).post(testRoute);

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    test.prop<CampaignCreationPayloadDTO>(
      {
        title: fc.stringMatching(/\S+/),
        description: fc.stringMatching(/\S+/),
        housing: fc.record({
          all: fc.boolean(),
          ids: fc.array(fc.uuid({ version: 4 })),
          filters: fc.record({
            housingIds: fc.array(fc.uuid({ version: 4 })),
            occupancies: fc.array(fc.constantFrom(...OCCUPANCY_VALUES)),
            energyConsumption: fc.array(
              fc.constantFrom(...ENERGY_CONSUMPTION_VALUES)
            ),
            establishmentIds: fc.array(fc.uuid({ version: 4 })),
            groupIds: fc.array(fc.uuid({ version: 4 })),
            campaignsCounts: fc.array(
              fc.constantFrom(...CAMPAIGN_COUNT_VALUES)
            ),
            campaignIds: fc.array(
              fc.oneof(fc.constant(null), fc.uuid({ version: 4 }))
            ),
            ownerIds: fc.array(fc.uuid({ version: 4 })),
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
            buildingPeriods: fc.array(
              fc.constantFrom(...BUILDING_PERIOD_VALUES)
            ),
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
      },
      { numRuns: 20 }
    )('should validate the campaign creation payload', async (payload) => {
      const { status } = await request(url)
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

      const { body, status } = await request(url)
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
        createdAt: expect.any(String),
        createdBy: expect.objectContaining({ id: user.id }),
        returnCount: null,
        returnRate: null,
        housingCount: expect.any(Number),
        ownerCount: expect.any(Number)
      });
      const campaign = await Campaigns().where({ id: body.id }).first();
      expect(campaign).not.toBeNull();
    });

    it('should attach housings to this campaign', async () => {
      const payload = await createPayload();

      const { body, status } = await request(url)
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

      const { body, status } = await request(url)
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

  describe('POST /campaigns when new-campaigns flag is enabled', () => {
    const testRoute = '/api/campaigns';
    const validPayload: CampaignCreationPayloadDTO = {
      title: 'Logements prioritaires',
      description: 'Campagne pour les logements prioritaires',
      housing: { all: false, ids: [], filters: {} }
    };

    it('should return 404', async () => {
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(true);

      const { status } = await request(url)
        .post(testRoute)
        .use(tokenProvider(user))
        .send(validPayload);

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });
  });

  describe('POST /groups/{id}/campaigns', () => {
    const testRoute = (id: string) => `/api/groups/${id}/campaigns`;

    const geoCode = faker.helpers.arrayElement(establishment.geoCodes);
    const group = genGroupApi(user, establishment);
    const groupHousings = faker.helpers.multiple(() => genHousingApi(geoCode), {
      count: {
        min: 10,
        max: 100
      }
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

    test.prop<CampaignCreationPayloadDTO>(
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
            .map((date) =>
              date.toISOString().substring(0, 'yyyy-mm-dd'.length)
            ),
          { nil: undefined }
        ),
        housing: fc.record({
          all: fc.boolean(),
          ids: fc.array(fc.uuid({ version: 4 })),
          filters: fc.record({
            housingIds: fc.array(fc.uuid({ version: 4 })),
            occupancies: fc.array(fc.constantFrom(...OCCUPANCY_VALUES)),
            energyConsumption: fc.array(
              fc.constantFrom(...ENERGY_CONSUMPTION_VALUES)
            ),
            establishmentIds: fc.array(fc.uuid({ version: 4 })),
            groupIds: fc.array(fc.uuid({ version: 4 })),
            campaignsCounts: fc.array(
              fc.constantFrom(...CAMPAIGN_COUNT_VALUES)
            ),
            campaignIds: fc.array(
              fc.oneof(fc.constant(null), fc.uuid({ version: 4 }))
            ),
            ownerIds: fc.array(fc.uuid({ version: 4 })),
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
            buildingPeriods: fc.array(
              fc.constantFrom(...BUILDING_PERIOD_VALUES)
            ),
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
            query: fc.stringMatching(/[a-zA-Z0-9-]/)
          })
        })
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
      const payload: CampaignCreationPayloadDTO = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        housing: {
          all: true,
          ids: [],
          filters: {}
        }
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
    const housingOwners = groupHousing.map((housing) =>
      genHousingOwnerApi(housing, housing.owner!)
    );

    beforeAll(async () => {
      await Groups().insert(formatGroupApi(group));
      await Housing().insert(groupHousing.map(formatHousingRecordApi));
      await Owners().insert(owners.map(formatOwnerApi));
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));
      await GroupsHousing().insert(formatGroupHousingApi(group, groupHousing));
    });

    it('should throw if the group is missing', async () => {
      const { status } = await request(url)
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

      const { status } = await request(url)
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
      const { body, status } = await request(url)
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
        createdAt: expect.any(String),
        createdBy: expect.objectContaining({ id: user.id }),
        returnCount: null,
        returnRate: null,
        housingCount: expect.any(Number),
        ownerCount: expect.any(Number)
      });
    });

    it("should add the group's housing to this campaign", async () => {
      const { body, status } = await request(url)
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
      const { body, status } = await request(url)
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

    beforeEach(async () => {
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(false);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const defaultPayload: CampaignUpdatePayloadDTO = {
      title: 'New title',
      description: '',
      status: 'sending'
    };

    async function createCampaign(status: CampaignStatus) {
      const campaign: CampaignApi = {
        ...genCampaignApi(establishment.id, user),
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
      const housings: HousingApi[] = faker.helpers.multiple(() => ({
        ...genHousingApi(faker.helpers.arrayElement(establishment.geoCodes)),
        status: HousingStatus.NEVER_CONTACTED
      }));
      await Housing().insert(housings.map(formatHousingRecordApi));
      await CampaignsHousing().insert(
        formatCampaignHousingApi(campaign, housings)
      );
      return campaign;
    }

    it('should be forbidden for a non-authenticated user', async () => {
      const campaign = await createCampaign('draft');

      const { status } = await request(url).put(testRoute(campaign.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should received a valid campaign id', async () => {
      await request(url)
        .put(testRoute(randomstring.generate()))
        .send(defaultPayload)
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_BAD_REQUEST);

      await request(url)
        .put(testRoute(uuidv4()))
        .send(defaultPayload)
        .use(tokenProvider(user))
        .expect(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should received a valid request', async () => {
      const campaign = await createCampaign('draft');

      async function fail(payload?: Record<string, unknown>): Promise<void> {
        const { status } = await request(url)
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

      const { body, status } = await request(url)
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

      const { body, status } = await request(url)
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
          status: CAMPAIGN_STATUS_LABELS[campaign.status],
          title: campaign.title,
          description: campaign.description
        },
        next_new: {
          status: CAMPAIGN_STATUS_LABELS[payload.status],
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

        const { body, status } = await request(url)
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

        const { body, status } = await request(url)
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
        const payload: CampaignUpdatePayloadDTO = {
          status: 'in-progress',
          sentAt: faker.date.recent().toJSON(),
          title: campaign.title,
          description: campaign.description
        };

        const { status } = await request(url)
          .put(testRoute(campaign.id))
          .send(payload)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_OK);
        const housings = await Housing()
          .join(campaignsHousingTable, (join) => {
            join.on('housing_geo_code', 'geo_code').andOn('housing_id', 'id');
          })
          .where({
            campaign_id: campaign.id
          });
        expect(housings.length).toBeGreaterThan(0);
        housings.forEach((housing) => {
          expect(housing).toMatchObject({
            status: HousingStatus.WAITING
          });
        });
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

        const { body, status } = await request(url)
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

        const { status } = await request(url)
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

  describe('PUT /campaigns/{id} when new-campaigns flag is enabled', () => {
    const testRoute = (id: string) => `/api/campaigns/${id}`;

    let campaign: CampaignApi;

    beforeEach(async () => {
      campaign = genCampaignApi(establishment.id, user);
      await Campaigns().insert(formatCampaignApi(campaign));
      vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
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
    const testRoute = (id: string) => `/api/campaigns/${id}`;

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

  describe('DELETE /campaigns/{id}/housing', () => {
    const testRoute = (id: string) => `/api/campaigns/${id}/housing`;

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
      const payload: CampaignRemovalPayloadDTO = {
        all: true,
        ids: [],
        filters: {}
      };

      const { status } = await request(url)
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

      const { status } = await request(url)
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

      const { status } = await request(url)
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
