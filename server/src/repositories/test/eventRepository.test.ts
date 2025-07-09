import { faker } from '@faker-js/faker/locale/fr';
import { ActiveOwnerRank, Occupancy } from '@zerologementvacant/models';

import {
  CampaignEventApi,
  CampaignHousingEventApi,
  GroupHousingEventApi,
  HousingEventApi,
  HousingOwnerEventApi,
  OwnerEventApi,
  PrecisionHousingEventApi
} from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import eventRepository, {
  CampaignEvents,
  CampaignHousingEvents,
  Events,
  formatCampaignEventApi,
  formatCampaignHousingEventApi,
  formatEventApi,
  formatGroupHousingEventApi,
  formatHousingEventApi,
  formatHousingOwnerEventApi,
  formatOwnerEventApi,
  formatPrecisionHousingEventApi,
  GroupHousingEvents,
  HousingEventDBO,
  HousingEvents,
  HousingOwnerEvents,
  OwnerEventDBO,
  OwnerEvents,
  PrecisionHousingEvents
} from '~/repositories/eventRepository';
import { formatGroupApi, Groups } from '~/repositories/groupRepository';
import {
  formatHousingOwnerApi,
  HousingOwners
} from '~/repositories/housingOwnerRepository';
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

describe('Event repository', () => {
  const establishment = genEstablishmentApi();
  const creator = genUserApi(establishment.id);

  beforeAll(async () => {
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(formatUserApi(creator));
  });

  describe('insertManyHousingEvents', () => {
    const housing = genHousingApi();
    const events: ReadonlyArray<HousingEventApi> = [
      genEventApi({
        creator,
        type: 'housing:created',
        nextOld: null,
        nextNew: {
          source: 'datafoncier-manual',
          occupancy: Occupancy.VACANT
        }
      }),
      genEventApi({
        creator,
        type: 'housing:occupancy-updated',
        nextOld: { occupancy: Occupancy.VACANT },
        nextNew: { occupancy: Occupancy.RENT }
      }),
      genEventApi({
        creator,
        type: 'housing:status-updated',
        nextOld: { status: 'never-contacted' },
        nextNew: { status: 'blocked' }
      })
    ].map((event) => ({
      ...event,
      housingGeoCode: housing.geoCode,
      housingId: housing.id
    }));
    const ids = events.map((event) => event.id);

    beforeAll(async () => {
      await Housing().insert(formatHousingRecordApi(housing));

      await eventRepository.insertManyHousingEvents(events);
    });

    it('should insert events', async () => {
      const actual = await Events().whereIn('id', ids);
      expect(actual.length).toBe(events.length);
    });

    it('should link events to the housing', async () => {
      const actual = await HousingEvents().whereIn('event_id', ids);
      expect(actual.length).toBe(events.length);
      expect(actual).toSatisfyAll<HousingEventDBO>(
        (event) => event.housing_geo_code === housing.geoCode
      );
      expect(actual).toSatisfyAll<HousingEventDBO>(
        (event) => event.housing_id === housing.id
      );
    });
  });

  describe('insertManyOwnerEvents', () => {
    const owner = genOwnerApi();
    const events: ReadonlyArray<OwnerEventApi> = [
      genEventApi({
        creator,
        type: 'owner:updated',
        nextOld: {
          name: faker.person.fullName(),
          birthdate: faker.date.birthdate().toJSON()
        },
        nextNew: {
          name: faker.person.fullName(),
          birthdate: faker.date.birthdate().toJSON()
        }
      })
    ].map((event) => ({
      ...event,
      ownerId: owner.id
    }));
    const ids = events.map((event) => event.id);

    beforeAll(async () => {
      await Owners().insert(formatOwnerApi(owner));

      await eventRepository.insertManyOwnerEvents(events);
    });

    it('should insert events', async () => {
      const actual = await Events().whereIn('id', ids);
      expect(actual.length).toBe(events.length);
    });

    it('should link events to the owner', async () => {
      const actual = await OwnerEvents().whereIn('event_id', ids);
      expect(actual.length).toBe(events.length);
      expect(actual).toSatisfyAll<OwnerEventDBO>(
        (event) => event.owner_id === owner.id
      );
    });
  });

  describe('find', () => {
    const housings: ReadonlyArray<HousingApi> = faker.helpers.multiple(() =>
      genHousingApi()
    );
    const housingOwners: ReadonlyArray<HousingOwnerApi> = housings.flatMap(
      (housing) => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: { min: 1, max: 6 }
        });
        return owners
          .map((owner) => genHousingOwnerApi(housing, owner))
          .map((housingOwner, i) => ({
            ...housingOwner,
            rank: (i + 1) as ActiveOwnerRank
          }));
      }
    );
    const groups = faker.helpers.multiple(() =>
      genGroupApi(creator, establishment)
    );
    const precisions = faker.helpers.multiple(() =>
      genPrecisionApi(faker.number.int({ min: 10000, max: 99999 }))
    );
    // Add campaign housing events fixtures
    const campaigns = faker.helpers.multiple(() =>
      genCampaignApi(establishment.id, creator.id)
    );

    const housingEvents: ReadonlyArray<HousingEventApi> =
      housings.map<HousingEventApi>((housing) => {
        return {
          ...genEventApi({
            creator,
            type: 'housing:created',
            nextOld: null,
            nextNew: {
              source: 'datafoncier-manual',
              occupancy: Occupancy.VACANT
            }
          }),
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        };
      });
    const groupHousingEvents: ReadonlyArray<GroupHousingEventApi> = groups
      .map((group) => {
        return housings.map<GroupHousingEventApi>((housing) => ({
          ...genEventApi({
            creator,
            type: 'housing:group-attached',
            nextOld: null,
            nextNew: { name: faker.commerce.productName() }
          }),
          groupId: group.id,
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        }));
      })
      .flat();
    const precisionHousingEvents: ReadonlyArray<PrecisionHousingEventApi> =
      precisions
        .map((precision) => {
          return housings.map<PrecisionHousingEventApi>((housing) => ({
            ...genEventApi({
              creator,
              type: 'housing:precision-attached',
              nextOld: null,
              nextNew: {
                category: precision.category,
                label: precision.label
              }
            }),
            precisionId: precision.id,
            housingGeoCode: housing.geoCode,
            housingId: housing.id
          }));
        })
        .flat();
    const housingOwnerEvents: ReadonlyArray<HousingOwnerEventApi> =
      housingOwners.map((housingOwner) => ({
        ...genEventApi({
          creator,
          type: 'housing:owner-attached',
          nextOld: null,
          nextNew: {
            name: housingOwner.fullName,
            rank: housingOwner.rank
          }
        }),
        housingGeoCode: housingOwner.housingGeoCode,
        housingId: housingOwner.housingId,
        ownerId: housingOwner.ownerId
      }));
    const campaignHousingEvents: ReadonlyArray<CampaignHousingEventApi> =
      campaigns
        .map((campaign) => {
          return housings.map((housing) => ({
            ...genEventApi({
              creator,
              type: 'housing:campaign-attached',
              nextOld: null,
              nextNew: {
                name: campaign.title
              }
            }),
            campaignId: campaign.id,
            housingGeoCode: housing.geoCode,
            housingId: housing.id
          }));
        })
        .flat();

    const events = [
      ...housingEvents,
      ...groupHousingEvents,
      ...precisionHousingEvents,
      ...housingOwnerEvents,
      ...campaignHousingEvents
    ];

    beforeAll(async () => {
      await Housing().insert(housings.map(formatHousingRecordApi));
      await Events().insert(events.map(formatEventApi));
      await HousingEvents().insert(housingEvents.map(formatHousingEventApi));
      await Groups().insert(groups.map(formatGroupApi));
      await GroupHousingEvents().insert(
        groupHousingEvents.map(formatGroupHousingEventApi)
      );
      await Precisions().insert(precisions.map(formatPrecisionApi));
      await PrecisionHousingEvents().insert(
        precisionHousingEvents.map(formatPrecisionHousingEventApi)
      );
      await Owners().insert(housingOwners.map(formatOwnerApi));
      await HousingOwners().insert(housingOwners.map(formatHousingOwnerApi));
      await HousingOwnerEvents().insert(
        housingOwnerEvents.map(formatHousingOwnerEventApi)
      );
      await Campaigns().insert(campaigns.map(formatCampaignApi));
      await CampaignHousingEvents().insert(
        campaignHousingEvents.map(formatCampaignHousingEventApi)
      );
    });

    it('should return events', async () => {
      const actual = await eventRepository.find();

      expect(actual.length).toBeGreaterThan(0);
    });

    it('should filter by housing, returning related events', async () => {
      const housing = faker.helpers.arrayElement(housings);

      const actual = await eventRepository.find({
        filters: {
          housings: [{ geoCode: housing.geoCode, id: housing.id }]
        }
      });

      events
        .filter((event) => event.housingGeoCode === housing.geoCode)
        .filter((event) => event.housingId === housing.id)
        .forEach((event) => {
          expect(actual).toPartiallyContain({
            id: event.id
          });
        });
    });

    describe('Precision housing events', () => {
      const types = [
        'housing:precision-attached',
        'housing:precision-detached'
      ] as const;

      const housings = faker.helpers.multiple(() => genHousingApi());
      const precisions = faker.helpers.multiple(
        () => genPrecisionApi(faker.number.int({ min: 10000, max: 99999 })),
        {
          count: { min: 10, max: 20 }
        }
      );
      const events: ReadonlyArray<PrecisionHousingEventApi> = housings
        .map((housing) => {
          return faker.helpers
            .arrayElements(precisions)
            .map<PrecisionHousingEventApi>((precision) => ({
              ...genEventApi({
                creator,
                type: 'housing:precision-attached',
                nextOld: null,
                nextNew: {
                  category: precision.category,
                  label: precision.label
                }
              }),
              precisionId: precision.id,
              housingGeoCode: housing.geoCode,
              housingId: housing.id
            }));
        })
        .flat();

      beforeAll(async () => {
        await Housing().insert(housings.map(formatHousingRecordApi));
        await Precisions().insert(precisions.map(formatPrecisionApi));
        await Events().insert(events.map(formatEventApi));
        await PrecisionHousingEvents().insert(
          events.map(formatPrecisionHousingEventApi)
        );
      });

      it('should return precision housing events', async () => {
        const actual = await eventRepository.find({
          filters: {
            types: types
          }
        });

        expect(actual.length).toBeGreaterThan(0);
        actual.forEach((event) => {
          expect(event.type).toBeOneOf(types);
        });
      });

      it('should filter by housing', async () => {
        const housing = faker.helpers.arrayElement(housings);

        const actual = await eventRepository.find({
          filters: {
            types: types,
            housings: [{ geoCode: housing.geoCode, id: housing.id }]
          }
        });

        const precisionHousingEvents = events
          .filter((event) => event.housingGeoCode === housing.geoCode)
          .filter((event) => event.housingId === housing.id);
        expect(precisionHousingEvents.length).toBeGreaterThan(0);
        precisionHousingEvents.forEach((event) => {
          expect(actual).toPartiallyContain({
            id: event.id
          });
        });
      });
    });

    describe('Housing owner events', () => {
      const types = [
        'housing:owner-attached',
        'housing:owner-updated',
        'housing:owner-detached'
      ] as const;

      it('should return housing owner events', async () => {
        const actual = await eventRepository.find({
          filters: {
            types: types
          }
        });

        expect(actual.length).toBeGreaterThan(0);
        actual.forEach((event) => {
          expect(event.type).toBeOneOf(types);
        });
      });

      it('should filter by housing', async () => {
        const housing = faker.helpers.arrayElement(housings);

        const actual = await eventRepository.find({
          filters: {
            types: types,
            housings: [{ geoCode: housing.geoCode, id: housing.id }]
          }
        });

        const housingOwnerEvents = events
          .filter((event) => event.housingGeoCode === housing.geoCode)
          .filter((event) => event.housingId === housing.id)
          .filter((event) => types.some((type) => type === event.type));
        expect(housingOwnerEvents.length).toBeGreaterThan(0);
        housingOwnerEvents.forEach((event) => {
          expect(actual).toPartiallyContain({
            id: event.id
          });
        });
      });
    });

    describe('Group housing events', () => {
      const housings = Array.from({ length: 3 }, () => genHousingApi());
      const groups = Array.from({ length: 3 }, () =>
        genGroupApi(creator, establishment)
      );
      const events: ReadonlyArray<GroupHousingEventApi> = groups
        .map((group) => {
          return housings.map((housing) => {
            const event = faker.helpers.arrayElement([
              genEventApi({
                creator,
                type: 'housing:group-attached',
                nextOld: null,
                nextNew: { name: faker.commerce.productName() }
              }),
              genEventApi({
                creator,
                type: 'housing:group-detached',
                nextOld: { name: faker.commerce.productName() },
                nextNew: null
              }),
              genEventApi({
                creator,
                type: 'housing:group-removed',
                nextOld: { name: faker.commerce.productName() },
                nextNew: null
              }),
              genEventApi({
                creator,
                type: 'housing:group-archived',
                nextOld: { name: faker.commerce.productName() },
                nextNew: null
              })
            ]);
            return {
              ...event,
              housingGeoCode: housing.geoCode,
              housingId: housing.id,
              groupId: group.id
            };
          });
        })
        .flat();

      beforeAll(async () => {
        await Housing().insert(housings.map(formatHousingRecordApi));
        await Groups().insert(groups.map(formatGroupApi));
        await Events().insert(events.map(formatEventApi));
        await GroupHousingEvents().insert(
          events.map(formatGroupHousingEventApi)
        );
      });

      it('should return group events', async () => {
        const types = [
          'housing:group-attached',
          'housing:group-detached',
          'housing:group-detached',
          'housing:group-removed'
        ] as const;

        const actual = await eventRepository.find({
          filters: {
            types: types
          }
        });

        expect(actual.length).toBeGreaterThan(0);
        actual.forEach((event) => {
          expect(event.type).toBeOneOf(types);
        });
      });

      it('should return group events even though the group has been removed', async () => {
        // TODO
      });

      it('should filter by housing', async () => {
        const types = [
          'housing:group-attached',
          'housing:group-detached',
          'housing:group-removed',
          'housing:group-archived'
        ] as const;
        const housing = faker.helpers.arrayElement(housings);

        const actual = await eventRepository.find({
          filters: {
            types: types,
            housings: [{ geoCode: housing.geoCode, id: housing.id }]
          }
        });

        const groupHousingEvents = events
          .filter((event) => event.housingGeoCode === housing.geoCode)
          .filter((event) => event.housingId === housing.id);
        expect(groupHousingEvents.length).toBeGreaterThan(0);
        groupHousingEvents.forEach((event) => {
          expect(actual).toPartiallyContain({
            id: event.id
          });
        });
      });
    });

    describe('Campaign housing events', () => {
      const types = [
        'housing:campaign-attached',
        'housing:campaign-detached'
      ] as const;

      it('should return campaign housing events', async () => {
        const actual = await eventRepository.find({
          filters: {
            types: types
          }
        });
        expect(actual.length).toBeGreaterThan(0);
        actual.forEach((event) => {
          expect(event.type).toBeOneOf(types);
        });
      });

      it('should filter by housing', async () => {
        const housing = faker.helpers.arrayElement(housings);
        const actual = await eventRepository.find({
          filters: {
            types: types,
            housings: [{ geoCode: housing.geoCode, id: housing.id }]
          }
        });
        const campaignHousingEvents = events
          .filter((event) => event.housingGeoCode === housing.geoCode)
          .filter((event) => event.housingId === housing.id)
          .filter((event) => types.some((type) => type === event.type));
        expect(campaignHousingEvents.length).toBeGreaterThan(0);
        campaignHousingEvents.forEach((event) => {
          expect(actual).toPartiallyContain({
            id: event.id
          });
        });
      });
    });

    describe('Owner events', () => {
      const types = ['owner:updated'] as const;
      const owners = faker.helpers.multiple(() => genOwnerApi());
      const events = owners.map<OwnerEventApi>((owner) => {
        const event = {
          ...genEventApi({
            creator,
            type: 'owner:updated',
            nextOld: {
              name: faker.person.fullName(),
              birthdate: faker.date.birthdate().toJSON()
            },
            nextNew: {
              name: faker.person.fullName(),
              birthdate: faker.date.birthdate().toJSON()
            }
          })
        };
        return {
          ...event,
          ownerId: owner.id
        };
      });

      beforeAll(async () => {
        await Owners().insert(owners.map(formatOwnerApi));
        await Events().insert(events.map(formatEventApi));
        await OwnerEvents().insert(events.map(formatOwnerEventApi));
      });

      it('should return owner events', async () => {
        const actual = await eventRepository.find({
          filters: {
            types: types
          }
        });

        expect(actual.length).toBeGreaterThan(0);
        actual.forEach((event) => {
          expect(event.type).toBeOneOf(types);
        });
      });

      it('should filter by owner', async () => {
        const owner = faker.helpers.arrayElement(owners);

        const actual = await eventRepository.find({
          filters: {
            types: types,
            owners: [owner.id]
          }
        });

        expect(actual.length).toBeGreaterThan(0);
        expect(actual).toIncludeAllPartialMembers(
          events
            .filter((event) => event.ownerId === owner.id)
            .map((event) => ({ id: event.id }))
        );
      });
    });
  });

  describe('removeCampaignEvents', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    const campaign = genCampaignApi(establishment.id, user.id);
    const events: ReadonlyArray<CampaignEventApi> = [
      {
        ...genEventApi({
          creator: user,
          type: 'campaign:updated',
          nextOld: { title: 'Old Title' },
          nextNew: { title: 'New Title' }
        }),
        campaignId: campaign.id
      }
    ];

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
      await Campaigns().insert(formatCampaignApi(campaign));
      await Events().insert(events.map(formatEventApi));
      await CampaignEvents().insert(events.map(formatCampaignEventApi));

      await eventRepository.removeCampaignEvents(campaign.id);
    });

    it('should remove the events', async () => {
      const actual = await Events().whereIn(
        'id',
        events.map((event) => event.id)
      );
      expect(actual).toBeArrayOfSize(0);
    });

    it('should remove the associated campaign events', async () => {
      const actual = await CampaignEvents().where({ campaign_id: campaign.id });
      expect(actual).toBeArrayOfSize(0);
    });
  });
});
