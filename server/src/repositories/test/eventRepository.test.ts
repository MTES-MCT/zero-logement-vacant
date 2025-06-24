import { faker } from '@faker-js/faker/locale/fr';
import { Occupancy } from '@zerologementvacant/models';

import {
  CampaignEventApi,
  GroupHousingEventApi,
  HousingEventApi,
  OwnerEventApi,
  PrecisionHousingEventApi
} from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
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
  Events,
  formatCampaignEventApi,
  formatEventApi,
  formatGroupHousingEventApi,
  formatHousingEventApi,
  formatOwnerEventApi,
  formatPrecisionHousingEventApi,
  GroupHousingEvents,
  HousingEventDBO,
  HousingEvents,
  OwnerEventDBO,
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
    const groups = faker.helpers.multiple(() =>
      genGroupApi(creator, establishment)
    );
    const precisions = faker.helpers.multiple(() =>
      genPrecisionApi(faker.number.int({ min: 10000, max: 99999 }))
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
    const events = [
      ...housingEvents,
      ...groupHousingEvents,
      ...precisionHousingEvents
    ];

    beforeAll(async () => {
      await Housing().insert(housings.map(formatHousingRecordApi));
      await Groups().insert(groups.map(formatGroupApi));
      await Precisions().insert(precisions.map(formatPrecisionApi));
      await Events().insert(events.map(formatEventApi));
      await HousingEvents().insert(housingEvents.map(formatHousingEventApi));
      await GroupHousingEvents().insert(
        groupHousingEvents.map(formatGroupHousingEventApi)
      );
      await PrecisionHousingEvents().insert(
        precisionHousingEvents.map(formatPrecisionHousingEventApi)
      );
    });

    it('should return events', async () => {
      const actual = await eventRepository.find();

      expect(actual.length).toBeGreaterThan(0);
    });

    it('should filter by housing, returning related group and precision events', async () => {
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

    describe('Precision events', () => {
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
        const types = [
          'housing:precision-attached',
          'housing:precision-detached'
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

      it('should filter by housing', async () => {
        const housing = faker.helpers.arrayElement(housings);

        const actual = await eventRepository.find({
          filters: {
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

    describe('Group events', () => {
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
