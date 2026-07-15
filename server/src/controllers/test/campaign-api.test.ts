import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import { fc, test } from '@fast-check/vitest';
import {
  CampaignDTO,
  CampaignRemovalPayload,
  CampaignUpdatePayload,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  UserRole,
  type CampaignCreationPayload,
  type UserDTO
} from '@zerologementvacant/models';
import type { Selectable } from 'kysely';
import randomstring from 'randomstring';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { CampaignEventApi } from '~/models/EventApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import { toEventInsert } from '~/repositories/eventRepository';
import { factories } from '~/test/factories';
import { genEventApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

describe('Campaign API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
  });

  let establishment: EstablishmentApi;
  let user: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  describe('GET /campaigns', () => {
    const testRoute = '/campaigns';

    let campaigns: CampaignDTO[];

    beforeAll(async () => {
      campaigns = await factories
        .campaign(establishment)
        .createList(3, {}, { associations: { createdBy: user } });
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
      const groups = await Promise.all(
        Array.from({ length: 2 }, () =>
          factories
            .group(establishment)
            .create({}, { associations: { createdBy: user } })
        )
      );
      const campaigns = await Promise.all(
        groups.map((group) =>
          factories
            .campaign(establishment)
            .create(
              { groupId: group.id },
              { associations: { createdBy: user } }
            )
        )
      );
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
      let sortCampaigns: CampaignDTO[];

      beforeEach(async () => {
        sortCampaigns = await factories
          .campaign(establishment)
          .createList(3, {}, { associations: { createdBy: user } });
        await Promise.all([
          kysely
            .updateTable('campaigns')
            .set({ housingCount: 10, ownerCount: 5, returnCount: 1 })
            .where('id', '=', sortCampaigns[0].id)
            .execute(),
          kysely
            .updateTable('campaigns')
            .set({ housingCount: 20, ownerCount: 3, returnCount: 4 })
            .where('id', '=', sortCampaigns[1].id)
            .execute(),
          kysely
            .updateTable('campaigns')
            .set({ housingCount: 5, ownerCount: 8, returnCount: 2 })
            .where('id', '=', sortCampaigns[2].id)
            .execute()
        ]);
      });

      afterEach(async () => {
        if (sortCampaigns?.length) {
          await kysely
            .deleteFrom('campaigns')
            .where(
              'id',
              'in',
              sortCampaigns.map((c) => c.id)
            )
            .execute();
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

    describe('validation', () => {
      it('should return 400 when query.groups contains a non-UUID', async () => {
        const { status, body } = await request(url)
          .get(`${testRoute}?groups=not-a-uuid`)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({ name: 'ValidationError' });
        expect(body.message).toMatch(/groups/i);
      });

      it('should return 400 when query.sort contains invalid characters', async () => {
        const { status, body } = await request(url)
          .get(`${testRoute}?sort=1!nope`)
          .use(tokenProvider(user));

        expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
        expect(body).toMatchObject({ name: 'ValidationError' });
        expect(body.message).toMatch(/sort/i);
      });
    });
  });

  describe('GET /campaigns/{id}', () => {
    const testRoute = (id: string) => `/campaigns/${id}`;

    let group: GroupApi;
    let campaign: CampaignDTO;

    beforeAll(async () => {
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      campaign = await factories
        .campaign(establishment)
        .create({ groupId: group.id }, { associations: { createdBy: user } });
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

    let group: GroupApi;
    let groupHousings: HousingApi[];

    beforeAll(async () => {
      const geoCode = faker.helpers.arrayElement(establishment.geoCodes);
      group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      groupHousings = await Promise.all(
        HOUSING_STATUS_VALUES.flatMap((status) =>
          Array.from({ length: 3 }, () =>
            factories.housing.create({ geoCode, status })
          )
        )
      );
      await Promise.all(
        groupHousings.map(async (housing) => {
          const owner = await factories.owner.create();
          await factories.housingOwner({ housing, owner }).create();
        })
      );
      await kysely
        .insertInto('groupsHousing')
        .values(
          groupHousings.map((housing) => ({
            groupId: group.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
    });

    /**
     * Creates a group with one housing per status, isolated from the shared
     * `group`/`groupHousings` fixtures above. The sentAt-gating tests use this
     * instead of the shared fixtures because other tests in this block send
     * randomized `sentAt` values against the shared group, which would flip
     * its NEVER_CONTACTED housings unpredictably.
     */
    async function createGroupWithHousings(): Promise<{
      group: GroupApi;
      housings: ReadonlyArray<HousingApi>;
    }> {
      const geoCode = faker.helpers.arrayElement(establishment.geoCodes);
      const isolatedGroup = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
      const isolatedHousings = await Promise.all(
        HOUSING_STATUS_VALUES.map((status) =>
          factories.housing.create({ geoCode, status })
        )
      );
      await Promise.all(
        isolatedHousings.map(async (housing) => {
          const owner = await factories.owner.create();
          await factories.housingOwner({ housing, owner }).create();
        })
      );
      await kysely
        .insertInto('groupsHousing')
        .values(
          isolatedHousings.map((housing) => ({
            groupId: isolatedGroup.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();

      return { group: isolatedGroup, housings: isolatedHousings };
    }

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
      const group = await factories
        .group(establishment)
        .create(
          { archivedAt: new Date() },
          { associations: { createdBy: user } }
        );

      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('should be forbidden for a visitor', async () => {
      const visitor = await factories.user.create({
        establishmentId: establishment.id,
        role: UserRole.VISITOR
      });
      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };

      const { status } = await request(url)
        .post(testRoute(group.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(visitor));

      expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
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
      const campaignHousing = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', body.id)
        .execute();
      expect(campaignHousing).toBeArrayOfSize(groupHousings.length);
      expect(campaignHousing).toIncludeAllPartialMembers(
        groupHousings.map((housing) => ({ housingId: housing.id }))
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
      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignHousingEvents',
          'campaignHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .select('campaignHousingEvents.housingId')
        .where('campaignHousingEvents.campaignId', '=', body.id)
        .where('events.type', '=', 'housing:campaign-attached')
        .execute();
      expect(events).toBeArrayOfSize(groupHousings.length);
      expect(events).toIncludeAllPartialMembers(
        groupHousings.map((housing) => ({
          housingId: housing.id,
          type: 'housing:campaign-attached'
        }))
      );
    });

    it('does not flip housings when sentAt is null', async () => {
      const { housings: isolatedHousings, group: isolatedGroup } =
        await createGroupWithHousings();

      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: null
      };

      const { body, status } = await request(url)
        .post(testRoute(isolatedGroup.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const neverContactedHousings = isolatedHousings.filter(
        (housing) => housing.status === HousingStatus.NEVER_CONTACTED
      );
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where((eb) =>
          eb(
            eb.refTuple('geoCode', 'id'),
            'in',
            neverContactedHousings.map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .execute();
      expect(actual).toSatisfyAll<Selectable<DB['fastHousing']>>(
        (housing) => housing.status === HousingStatus.NEVER_CONTACTED
      );

      const statusEvents = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where((eb) =>
          eb(
            eb.refTuple(
              'housingEvents.housingGeoCode',
              'housingEvents.housingId'
            ),
            'in',
            isolatedHousings.map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .execute();
      expect(statusEvents).toBeArrayOfSize(0);

      const links = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', body.id)
        .execute();
      expect(links).toBeArrayOfSize(isolatedHousings.length);

      const attachEvents = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignHousingEvents',
          'campaignHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('campaignHousingEvents.campaignId', '=', body.id)
        .where('events.type', '=', 'housing:campaign-attached')
        .execute();
      expect(attachEvents).toBeArrayOfSize(isolatedHousings.length);
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
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where((eb) =>
          eb(
            eb.refTuple('geoCode', 'id'),
            'in',
            notNeverContactedHousings.map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .execute();
      expect(actual.length).toBeGreaterThan(0);
      expect(actual).toSatisfyAll<Selectable<DB['fastHousing']>>(
        (housing) => housing.status !== HousingStatus.WAITING
      );
    });

    it('flips housings immediately when sentAt is already past', async () => {
      const { housings: isolatedHousings, group: isolatedGroup } =
        await createGroupWithHousings();

      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: '2020-01-01'
      };

      const { body, status } = await request(url)
        .post(testRoute(isolatedGroup.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const neverContactedHousings = isolatedHousings.filter(
        (housing) => housing.status === HousingStatus.NEVER_CONTACTED
      );
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where((eb) =>
          eb(
            eb.refTuple('geoCode', 'id'),
            'in',
            neverContactedHousings.map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .execute();
      expect(actual).toSatisfyAll<Selectable<DB['fastHousing']>>(
        (housing) => housing.status === HousingStatus.WAITING
      );

      const statusEvents = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where((eb) =>
          eb(
            eb.refTuple(
              'housingEvents.housingGeoCode',
              'housingEvents.housingId'
            ),
            'in',
            neverContactedHousings.map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .execute();
      expect(statusEvents).toBeArrayOfSize(neverContactedHousings.length);

      const links = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', body.id)
        .execute();
      expect(links).toBeArrayOfSize(isolatedHousings.length);

      const attachEvents = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignHousingEvents',
          'campaignHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('campaignHousingEvents.campaignId', '=', body.id)
        .where('events.type', '=', 'housing:campaign-attached')
        .execute();
      expect(attachEvents).toBeArrayOfSize(isolatedHousings.length);
    });

    it('does not flip housings when sentAt is in the future', async () => {
      const { housings: isolatedHousings, group: isolatedGroup } =
        await createGroupWithHousings();

      const payload: CampaignCreationPayload = {
        title: 'Logements prioritaires',
        description: 'Campagne pour les logements prioritaires',
        sentAt: '2999-01-01'
      };

      const { body, status } = await request(url)
        .post(testRoute(isolatedGroup.id))
        .send(payload)
        .type('json')
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_CREATED);
      const neverContactedHousings = isolatedHousings.filter(
        (housing) => housing.status === HousingStatus.NEVER_CONTACTED
      );
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where((eb) =>
          eb(
            eb.refTuple('geoCode', 'id'),
            'in',
            neverContactedHousings.map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .execute();
      expect(actual).toSatisfyAll<Selectable<DB['fastHousing']>>(
        (housing) => housing.status === HousingStatus.NEVER_CONTACTED
      );

      const statusEvents = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where((eb) =>
          eb(
            eb.refTuple(
              'housingEvents.housingGeoCode',
              'housingEvents.housingId'
            ),
            'in',
            isolatedHousings.map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .execute();
      expect(statusEvents).toBeArrayOfSize(0);

      const links = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', body.id)
        .execute();
      expect(links).toBeArrayOfSize(isolatedHousings.length);

      const attachEvents = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignHousingEvents',
          'campaignHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('campaignHousingEvents.campaignId', '=', body.id)
        .where('events.type', '=', 'housing:campaign-attached')
        .execute();
      expect(attachEvents).toBeArrayOfSize(isolatedHousings.length);
    });
  });

  describe('PUT /campaigns/{id}', () => {
    const testRoute = (id: string) => `/campaigns/${id}`;

    let campaign: CampaignDTO;

    beforeEach(async () => {
      campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
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

      const actual = await kysely
        .selectFrom('campaigns')
        .selectAll('campaigns')
        .where('id', '=', campaign.id)
        .executeTakeFirst();
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
      const campaignWithSentAt = await factories
        .campaign(establishment)
        .create(
          { sentAt: '2024-06-15' },
          { associations: { createdBy: user } }
        );

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

    let campaign: CampaignDTO;

    beforeEach(async () => {
      campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
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
      const otherEstablishment = await factories.establishment.create();
      const otherUser = await factories.user.create({
        establishmentId: otherEstablishment.id
      });

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

      const actual = await kysely
        .selectFrom('campaigns')
        .selectAll('campaigns')
        .where('id', '=', campaign.id)
        .executeTakeFirst();
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
      await kysely.insertInto('events').values(toEventInsert(event)).execute();
      await kysely
        .insertInto('campaignEvents')
        .values({ eventId: event.id, campaignId: campaign.id })
        .execute();

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const actualEvent = await kysely
        .selectFrom('events')
        .selectAll('events')
        .where('id', '=', event.id)
        .executeTakeFirst();
      expect(actualEvent).toBeUndefined();
      const actualCampaignEvent = await kysely
        .selectFrom('campaignEvents')
        .selectAll('campaignEvents')
        .where('campaignId', '=', campaign.id)
        .where('eventId', '=', event.id)
        .execute();
      expect(actualCampaignEvent).toBeArrayOfSize(0);
    });

    it('should unlink the associated housings', async () => {
      const housings = await Promise.all(
        faker.helpers.multiple(() =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes)
          })
        )
      );
      await kysely
        .insertInto('campaignsHousing')
        .values(
          housings.map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();

      await request(url)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const actualCampaignHouses = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(actualCampaignHouses).toBeArrayOfSize(0);
    });

    it('should set the status to "never contacted" for each housing that has a status "waiting" and has no other campaign', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes),
        status: HousingStatus.WAITING
      });
      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: campaign.id,
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        })
        .execute();

      await request(url)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const actualHousing = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where('geoCode', '=', housing.geoCode)
        .where('id', '=', housing.id)
        .executeTakeFirst();
      expect(actualHousing).toMatchObject({
        geoCode: housing.geoCode,
        id: housing.id,
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      });
    });

    it('should create an event "housing:campaign-removed" for each housing', async () => {
      const housings = await Promise.all(
        faker.helpers.multiple(() =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes)
          })
        )
      );
      await kysely
        .insertInto('campaignsHousing')
        .values(
          housings.map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();

      await request(url)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignHousingEvents',
          'campaignHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .where('events.type', '=', 'housing:campaign-removed')
        .where('campaignHousingEvents.campaignId', 'is', null)
        .where((eb) =>
          eb(
            eb.refTuple(
              'campaignHousingEvents.housingGeoCode',
              'campaignHousingEvents.housingId'
            ),
            'in',
            housings.map((housing) => eb.tuple(housing.geoCode, housing.id))
          )
        )
        .execute();
      expect(events).toBeArrayOfSize(housings.length);
    });

    it('should create an event "housing:status-updated" for each housing that has a status "waiting" and has no other campaign', async () => {
      const housings = await Promise.all(
        faker.helpers.multiple(() =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes),
            status: HousingStatus.WAITING
          })
        )
      );
      await kysely
        .insertInto('campaignsHousing')
        .values(
          housings.map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();

      await request(url)
        .delete(testRoute(campaign.id))
        .use(tokenProvider(user));

      const events = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where((eb) =>
          eb(
            eb.refTuple(
              'housingEvents.housingGeoCode',
              'housingEvents.housingId'
            ),
            'in',
            housings.map((housing) => eb.tuple(housing.geoCode, housing.id))
          )
        )
        .execute();
      expect(events).toBeArrayOfSize(housings.length);
    });
  });

  describe('DELETE /campaigns/{id}/housings', () => {
    const testRoute = (id: string) => `/campaigns/${id}/housings`;

    let campaign: CampaignDTO;
    let housings: HousingApi[];

    beforeEach(async () => {
      campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });

      housings = await Promise.all(
        faker.helpers.multiple(() =>
          factories.housing.create({
            geoCode: faker.helpers.arrayElement(establishment.geoCodes)
          })
        )
      );
      await kysely
        .insertInto('campaignsHousing')
        .values(
          housings.map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();
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
      const otherEstablishment = await factories.establishment.create();
      const otherUser = await factories.user.create({
        establishmentId: otherEstablishment.id
      });

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

      const actualCampaignHousings = await kysely
        .selectFrom('campaignsHousing')
        .selectAll('campaignsHousing')
        .where('campaignId', '=', campaign.id)
        .execute();
      expect(actualCampaignHousings).toBeArrayOfSize(shouldKeep.length);
      expect(actualCampaignHousings).toIncludeAllPartialMembers(
        shouldKeep.map((housing) => ({ housingId: housing.id }))
      );
    });

    it('should create an event "housing:campaign-detached"', async () => {
      const payload: CampaignRemovalPayload = {
        all: false,
        housingIds: housings.map((housing) => housing.id)
      };

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);

      const events = await kysely
        .selectFrom('events')
        .innerJoin(
          'campaignHousingEvents',
          'campaignHousingEvents.eventId',
          'events.id'
        )
        .selectAll('events')
        .select('campaignHousingEvents.housingId')
        .where('events.type', '=', 'housing:campaign-detached')
        .where('campaignHousingEvents.campaignId', '=', campaign.id)
        .execute();

      expect(events).toBeArrayOfSize(housings.length);
      expect(events).toIncludeAllPartialMembers(
        housings.map((housing) => ({ housingId: housing.id }))
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
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const otherCampaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .insertInto('campaignsHousing')
        .values([
          {
            // Should be reset because in status "waiting"
            // and will not be in any campaign after the deletion
            campaignId: campaign.id,
            housingGeoCode: mustReset.geoCode,
            housingId: mustReset.id
          },
          {
            campaignId: campaign.id,
            housingGeoCode: mustNotReset[0].geoCode,
            housingId: mustNotReset[0].id
          },
          {
            // Should not be reset because still in another campaign
            campaignId: otherCampaign.id,
            housingGeoCode: mustNotReset[0].geoCode,
            housingId: mustNotReset[0].id
          },
          {
            // Should not be reset because not in status "waiting"
            campaignId: campaign.id,
            housingGeoCode: mustNotReset[1].geoCode,
            housingId: mustNotReset[1].id
          }
        ])
        .execute();

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .send({
          all: false,
          housingIds: [mustReset, ...mustNotReset].map((housing) => housing.id)
        })
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll('fastHousing')
        .where((eb) =>
          eb(
            eb.refTuple('geoCode', 'id'),
            'in',
            [mustReset, ...mustNotReset].map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .execute();
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
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const otherCampaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      await kysely
        .insertInto('campaignsHousing')
        .values([
          {
            // Should be reset because in status "waiting"
            // and will not be in any campaign after the deletion
            campaignId: campaign.id,
            housingGeoCode: mustReset.geoCode,
            housingId: mustReset.id
          },
          {
            campaignId: campaign.id,
            housingGeoCode: mustNotReset[0].geoCode,
            housingId: mustNotReset[0].id
          },
          {
            // Should not be reset because still in another campaign
            campaignId: otherCampaign.id,
            housingGeoCode: mustNotReset[0].geoCode,
            housingId: mustNotReset[0].id
          },
          {
            // Should not be reset because not in status "waiting"
            campaignId: campaign.id,
            housingGeoCode: mustNotReset[1].geoCode,
            housingId: mustNotReset[1].id
          }
        ])
        .execute();
      const payload: CampaignRemovalPayload = {
        all: false,
        housingIds: [mustReset, ...mustNotReset].map((housing) => housing.id)
      };

      const { status } = await request(url)
        .delete(testRoute(campaign.id))
        .send(payload)
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_NO_CONTENT);
      const event = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where((eb) =>
          eb(
            eb.refTuple(
              'housingEvents.housingGeoCode',
              'housingEvents.housingId'
            ),
            'in',
            [mustReset, ...mustNotReset].map((housing) =>
              eb.tuple(housing.geoCode, housing.id)
            )
          )
        )
        .executeTakeFirst();
      expect(event).not.toBeNull();
    });
  });
});
