import { constants } from 'http2';

import { faker } from '@faker-js/faker/locale/fr';
import {
  EventType,
  Occupancy,
  PrecisionCategory
} from '@zerologementvacant/models';
import { Record } from 'effect';
import { snakeToCamel } from 'effect/String';
import type { Insertable } from 'kysely';
import request from 'supertest';

import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createServer } from '~/infra/server';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import {
  CampaignHousingEventApi,
  EventApi,
  GroupHousingEventApi,
  HousingEventApi,
  HousingOwnerEventApi,
  OwnerEventApi,
  PrecisionHousingEventApi
} from '~/models/EventApi';
import { OwnerApi } from '~/models/OwnerApi';
import { UserApi } from '~/models/UserApi';
import { formatEventApi } from '~/repositories/eventRepository';
import { factories } from '~/test/factories';
import { genEventApi, genHousingOwnerApi } from '~/test/testFixtures';
import { tokenProvider } from '~/test/testUtils';

function toEventValues<Type extends EventType>(
  event: EventApi<Type>
): Insertable<DB['events']> {
  return Record.mapKeys(
    formatEventApi(event) as unknown as Record<string, unknown>,
    snakeToCamel
  ) as Insertable<DB['events']>;
}

describe('Event API', () => {
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

  describe('GET /owners/{id}/events', () => {
    const testRoute = (id: string) => `/owners/${id}/events`;

    let owner: OwnerApi;
    let events: ReadonlyArray<OwnerEventApi>;

    beforeAll(async () => {
      owner = await factories.owner.create();
      events = faker.helpers
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

      await kysely
        .insertInto('events')
        .values(events.map(toEventValues))
        .execute();
      await kysely
        .insertInto('ownerEvents')
        .values(
          events.map((event) => ({
            ownerId: event.ownerId,
            eventId: event.id
          }))
        )
        .execute();
    });

    it('should be forbidden for a non-authenticated user', async () => {
      const { status } = await request(url).get(testRoute(owner.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should validate inputs', async () => {
      const { status } = await request(url)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list owner events', async () => {
      const { body, status } = await request(url)
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
    const testRoute = (id: string) => `/housing/${id}/events`;

    async function setUp() {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });
      const owner = await factories.owner.create();
      const housingOwner = genHousingOwnerApi(housing, owner);
      const housingEvents: ReadonlyArray<HousingEventApi> = [
        genEventApi({
          creator: user,
          type: 'housing:created',
          nextOld: null,
          nextNew: {
            source: 'datafoncier-manual',
            occupancy: Occupancy.VACANT
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
      const precision = await kysely
        .selectFrom('precisions')
        .selectAll()
        .executeTakeFirstOrThrow();
      const precisionHousingEvents: ReadonlyArray<PrecisionHousingEventApi> = [
        genEventApi({
          creator: user,
          type: 'housing:precision-attached',
          nextOld: null,
          nextNew: {
            category: precision.category as PrecisionCategory,
            label: precision.label
          }
        }),
        genEventApi({
          creator: user,
          type: 'housing:precision-detached',
          nextOld: {
            category: precision.category as PrecisionCategory,
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
      const group = await factories
        .group(establishment)
        .create({}, { associations: { createdBy: user } });
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
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
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
      await kysely
        .insertInto('events')
        .values(events.map(toEventValues))
        .execute();
      await Promise.all([
        kysely
          .insertInto('housingEvents')
          .values(
            housingEvents.map((event) => ({
              housingGeoCode: event.housingGeoCode,
              housingId: event.housingId,
              eventId: event.id
            }))
          )
          .execute(),
        kysely
          .insertInto('precisionHousingEvents')
          .values(
            precisionHousingEvents.map((event) => ({
              housingGeoCode: event.housingGeoCode,
              housingId: event.housingId,
              precisionId: event.precisionId,
              eventId: event.id
            }))
          )
          .execute(),
        kysely
          .insertInto('housingOwnerEvents')
          .values(
            housingOwnerEvents.map((event) => ({
              housingGeoCode: event.housingGeoCode,
              housingId: event.housingId,
              ownerId: event.ownerId,
              eventId: event.id
            }))
          )
          .execute(),
        kysely
          .insertInto('groupHousingEvents')
          .values(
            groupHousingEvents.map((event) => ({
              housingGeoCode: event.housingGeoCode,
              housingId: event.housingId,
              groupId: event.groupId,
              eventId: event.id
            }))
          )
          .execute(),
        kysely
          .insertInto('campaignHousingEvents')
          .values(
            campaignHousingEvents.map((event) => ({
              campaignId: event.campaignId,
              housingGeoCode: event.housingGeoCode,
              housingId: event.housingId,
              eventId: event.id
            }))
          )
          .execute()
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

      const { status } = await request(url).get(testRoute(housing.id));

      expect(status).toBe(constants.HTTP_STATUS_UNAUTHORIZED);
    });

    it('should validate inputs', async () => {
      const { status } = await request(url)
        .get(testRoute('id'))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('should list housing events', async () => {
      const { housing, events } = await setUp();

      const { body, status } = await request(url)
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

      const { body, status } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body.length).toBeGreaterThan(0);
      expect(body).toBeSorted({
        key: 'createdAt',
        descending: true
      });
    });

    it('should not return owner:updated events if there are no housing owners', async () => {
      const housing = await factories.housing.create({
        geoCode: faker.helpers.arrayElement(establishment.geoCodes)
      });

      const owner = await factories.owner.create();

      const ownerEvent = genEventApi({
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
      const ownerEventApi: OwnerEventApi = {
        ...ownerEvent,
        ownerId: owner.id
      };

      await kysely
        .insertInto('events')
        .values(toEventValues(ownerEvent))
        .execute();
      await kysely
        .insertInto('ownerEvents')
        .values({ ownerId: ownerEventApi.ownerId, eventId: ownerEventApi.id })
        .execute();

      const { body, status } = await request(url)
        .get(testRoute(housing.id))
        .use(tokenProvider(user));

      expect(status).toBe(constants.HTTP_STATUS_OK);
      expect(body).not.toPartiallyContain({
        id: ownerEvent.id
      });
    });
  });
});
