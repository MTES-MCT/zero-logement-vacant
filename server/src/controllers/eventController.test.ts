import { faker } from '@faker-js/faker/locale/fr';
import { Occupancy } from '@zerologementvacant/models';
import { constants } from 'http2';
import request from 'supertest';
import { createServer } from '~/infra/server';
import {
  CampaignHousingEventApi,
  GroupHousingEventApi,
  HousingEventApi,
  HousingOwnerEventApi,
  OwnerEventApi,
  PrecisionHousingEventApi
} from '~/models/EventApi';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  CampaignHousingEvents,
  Events,
  formatCampaignHousingEventApi,
  formatEventApi,
  formatGroupHousingEventApi,
  formatHousingEventApi,
  formatHousingOwnerEventApi,
  formatOwnerEventApi,
  formatPrecisionHousingEventApi,
  GroupHousingEvents,
  HousingEvents,
  HousingOwnerEvents,
  OwnerEvents,
  PrecisionHousingEvents
} from '~/repositories/eventRepository';
import { formatGroupApi, Groups } from '~/repositories/groupRepository';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import { formatOwnerApi, Owners } from '~/repositories/ownerRepository';
import {
  formatPrecisionApi,
  Precisions
} from '~/repositories/precisionRepository';
import { formatUserApi, Users } from '~/repositories/userRepository';
import {
  genCampaignApi,
  genEstablishmentApi,
  genEventApi,
  genGroupApi,
  genHousingApi,
  genHousingOwnerApi,
  genOwnerApi,
  genPrecisionApi,
  genUserApi
} from '~/test/testFixtures';

import { tokenProvider } from '~/test/testUtils';

describe('Event API', () => {
  const { app } = createServer();

  const establishment = genEstablishmentApi();
  const user = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(user));
  });

  describe('GET /owners/{id}/events', () => {
    const testRoute = (id: string) => `/api/owners/${id}/events`;

    const owner = genOwnerApi();
    const events = faker.helpers
      .multiple(() => {
        return genEventApi({
          creator: user,
          type: 'owner:updated',
          nextOld: {
            name: faker.person.fullName(),
            birthdate: faker.date.birthdate().toJSON()
          },
          nextNew: {
            name: faker.person.fullName(),
            birthdate: faker.date.birthdate().toJSON()
          }
        });
      })
      .map<OwnerEventApi>((event) => ({
        ...event,
        ownerId: owner.id
      }));

    beforeAll(async () => {
      await Owners().insert(formatOwnerApi(owner));
      await Events().insert(events.map(formatEventApi));
      await OwnerEvents().insert(events.map(formatOwnerEventApi));
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(app).get(testRoute(owner.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should validate inputs', async () => {
      const { status } = await request(app)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list owner events', async () => {
      const { body, status } = await request(app)
        .get(testRoute(owner.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      events.forEach((event) => {
        expect(body).toPartiallyContain({
          id: event.id
        });
      });
    });
  });

  describe('GET /housing/{id}/events', () => {
    const testRoute = (id: string) => `/api/housing/${id}/events`;

    async function setUp() {
      const housing = genHousingApi(
        faker.helpers.arrayElement(establishment.geoCodes)
      );
      await Housing().insert(formatHousingRecordApi(housing));
      const owner = genOwnerApi();
      await Owners().insert(formatOwnerApi(owner));
      const housingOwner = genHousingOwnerApi(housing, owner);
      const housingEvents: ReadonlyArray<HousingEventApi> = [
        genEventApi({
          creator: user,
          type: 'housing:created',
          nextOld: null,
          nextNew: {
            source: 'datafoncier-manual'
          }
        }),
        genEventApi({
          creator: user,
          type: 'housing:occupancy-updated',
          nextOld: { occupancy: Occupancy.VACANT },
          nextNew: { occupancy: Occupancy.RENT }
        }),
        genEventApi({
          creator: user,
          type: 'housing:status-updated',
          nextOld: { status: 'never-contacted' },
          nextNew: { status: 'first-contact' }
        })
      ].map<HousingEventApi>((event) => ({
        ...event,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }));
      const precision = genPrecisionApi(1000);
      await Precisions().insert(formatPrecisionApi(precision));
      const precisionHousingEvents: ReadonlyArray<PrecisionHousingEventApi> = [
        genEventApi({
          creator: user,
          type: 'housing:precision-attached',
          nextOld: null,
          nextNew: {
            category: precision.category,
            label: precision.label
          }
        }),
        genEventApi({
          creator: user,
          type: 'housing:precision-detached',
          nextOld: {
            category: precision.category,
            label: precision.label
          },
          nextNew: null
        })
      ].map<PrecisionHousingEventApi>((event) => ({
        ...event,
        precisionId: precision.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }));
      const housingOwnerEvents: ReadonlyArray<HousingOwnerEventApi> = [
        genEventApi({
          creator: user,
          type: 'housing:owner-attached',
          nextOld: null,
          nextNew: {
            name: housingOwner.fullName,
            rank: housingOwner.rank
          }
        }),
        genEventApi({
          creator: user,
          type: 'housing:owner-detached',
          nextOld: {
            name: housingOwner.fullName,
            rank: housingOwner.rank
          },
          nextNew: null
        }),
        genEventApi({
          creator: user,
          type: 'housing:owner-updated',
          nextOld: {
            name: housingOwner.fullName,
            rank: housingOwner.rank
          },
          nextNew: {
            name: housingOwner.fullName,
            rank: 1
          }
        })
      ].map<HousingOwnerEventApi>((event) => ({
        ...event,
        ownerId: housingOwner.ownerId,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }));
      const group = genGroupApi(user, establishment);
      await Groups().insert(formatGroupApi(group));
      const groupHousingEvents: ReadonlyArray<GroupHousingEventApi> = [
        genEventApi({
          creator: user,
          type: 'housing:group-attached',
          nextOld: null,
          nextNew: {
            name: faker.lorem.words(3)
          }
        }),
        genEventApi({
          creator: user,
          type: 'housing:group-detached',
          nextOld: {
            name: faker.lorem.words(3)
          },
          nextNew: null
        }),
        genEventApi({
          creator: user,
          type: 'housing:group-removed',
          nextOld: {
            name: faker.lorem.words(3)
          },
          nextNew: null
        }),
        genEventApi({
          creator: user,
          type: 'housing:group-archived',
          nextOld: {
            name: faker.lorem.words(3)
          },
          nextNew: null
        })
      ].map<GroupHousingEventApi>((event) => ({
        ...event,
        groupId: group.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }));
      const campaign = genCampaignApi(establishment.id, user.id);
      await Campaigns().insert(formatCampaignApi(campaign));
      const campaignHousingEvents: ReadonlyArray<CampaignHousingEventApi> = [
        genEventApi({
          creator: user,
          type: 'housing:campaign-attached',
          nextOld: null,
          nextNew: {
            name: campaign.title
          }
        }),
        genEventApi({
          creator: user,
          type: 'housing:campaign-detached',
          nextOld: {
            name: campaign.title
          },
          nextNew: null
        }),
        genEventApi({
          creator: user,
          type: 'housing:campaign-removed',
          nextOld: {
            name: campaign.title
          },
          nextNew: null
        })
      ].map<CampaignHousingEventApi>((event) => ({
        ...event,
        campaignId: campaign.id,
        housingGeoCode: housing.geoCode,
        housingId: housing.id
      }));

      const events = [
        ...housingEvents,
        ...precisionHousingEvents,
        ...housingOwnerEvents,
        ...groupHousingEvents,
        ...campaignHousingEvents
      ];
      await Events().insert(events.map(formatEventApi));
      await Promise.all([
        HousingEvents().insert(housingEvents.map(formatHousingEventApi)),
        PrecisionHousingEvents().insert(
          precisionHousingEvents.map(formatPrecisionHousingEventApi)
        ),
        HousingOwnerEvents().insert(
          housingOwnerEvents.map(formatHousingOwnerEventApi)
        ),
        GroupHousingEvents().insert(
          groupHousingEvents.map(formatGroupHousingEventApi)
        ),
        CampaignHousingEvents().insert(
          campaignHousingEvents.map(formatCampaignHousingEventApi)
        )
      ]);

      return {
        housing,
        precision,
        housingOwner,
        group,
        campaign,
        events,
        housingEvents,
        precisionHousingEvents,
        housingOwnerEvents,
        groupHousingEvents,
        campaignHousingEvents
      };
    }

    it('should be forbidden for a non-authenticated user', async () => {
      const { housing } = await setUp();

      const { status } = await request(app).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should validate inputs', async () => {
      const { status } = await request(app)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list housing events', async () => {
      const { housing, events } = await setUp();

      const { body, status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      events.forEach((event) => {
        expect(body).toPartiallyContain({
          id: event.id
        });
      });
    });

    it('should be sorted by creation date in descending order', async () => {
      const { housing } = await setUp();

      const { body, status } = await request(app)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toBeSorted({
        key: 'createdAt',
        descending: true
      });
    });
  });
});
