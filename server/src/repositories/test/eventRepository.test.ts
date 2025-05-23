import { v4 as uuidv4 } from 'uuid';
import { CampaignApi } from '~/models/CampaignApi';
import { EventApi } from '~/models/EventApi';
import { GroupApi } from '~/models/GroupApi';
import {
  Campaigns,
  formatCampaignApi
} from '~/repositories/campaignRepository';

import {
  genCampaignApi,
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genHousingEventApi,
  genUserApi,
  oneOf
} from '../../test/testFixtures';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import eventRepository, {
  CampaignEvents,
  Events,
  formatEventApi,
  GroupHousingEvents
} from '../eventRepository';
import { formatGroupApi, Groups } from '../groupRepository';
import { formatHousingRecordApi, Housing } from '../housingRepository';
import { formatUserApi, Users } from '../userRepository';

describe('Event repository', () => {
  describe('findGroupHousingEvents', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
    });

    it('should return events with the event creator', async () => {
      const campaigns = Array.from({ length: 3 }, () =>
        genCampaignApi(establishment.id, user.id)
      );
      await Campaigns().insert(campaigns.map(formatCampaignApi));
      const events: EventApi<CampaignApi>[] = campaigns.map((campaign) => ({
        id: uuidv4(),
        name: 'Création de la campagne',
        kind: 'Create',
        category: 'Campaign',
        section: 'Suivi de campagne',
        conflict: false,
        old: undefined,
        new: campaign,
        createdAt: new Date(),
        createdBy: user.id
      }));
      await Events().insert(events.map(formatEventApi));
      const campaignEvents = events.map((event) => ({
        event_id: event.id,
        campaign_id: event.new?.id
      }));
      await CampaignEvents().insert(campaignEvents);

      const [campaign] = campaigns;
      const actual = await eventRepository.findCampaignEvents(campaign.id);

      expect(actual).toSatisfyAll<EventApi<CampaignApi>>((event) => {
        return event.creator?.id === user.id;
      });
    });

    it('should return events linked to a group and a housing', async () => {
      const houses = Array.from({ length: 3 }).map(() =>
        genHousingApi(oneOf(establishment.geoCodes))
      );
      const group = genGroupApi(user, establishment);
      const events: EventApi<GroupApi>[] = houses.map(() => ({
        id: uuidv4(),
        name: 'Ce logement a été ajouté à un groupe',
        kind: 'Create',
        category: 'Group',
        section: 'Ajout d’un logement dans un groupe',
        conflict: false,
        old: undefined,
        new: group,
        createdAt: new Date(),
        createdBy: user.id
      }));
      const groupHousingEvents = houses.map((housing, i) => ({
        event_id: events[i].id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
        group_id: group.id
      }));
      await Housing().insert(houses.map(formatHousingRecordApi));
      await Groups().insert(formatGroupApi(group));
      await Events().insert(events.map(formatEventApi));
      await GroupHousingEvents().insert(groupHousingEvents);

      const actual = await eventRepository.findGroupHousingEvents(
        houses[0],
        group
      );

      expect(actual).toBeArrayOfSize(1);
    });
  });

  describe('insertManyHousingEvents', () => {
    it('should denormalize the housing status', async () => {
      const establishment = genEstablishmentApi();
      const housing = genHousingApi();
      const creator = genUserApi(establishment.id);
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(creator));
      await Housing().insert(formatHousingRecordApi(housing));
      const event = genHousingEventApi(housing, creator);

      await eventRepository.insertManyHousingEvents([event]);

      const actual = await Events().where({ id: event.id }).first();
      expect(actual?.old?.status).toBeString();
      expect(actual?.new?.status).toBeString();
    });
  });
});
