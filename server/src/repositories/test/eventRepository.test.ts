import { v4 as uuidv4 } from 'uuid';

import {
  genEstablishmentApi,
  genGroupApi,
  genHousingApi,
  genUserApi,
  oneOf
} from '../../test/testFixtures';
import { formatHousingRecordApi, Housing } from '../housingRepository';
import { formatGroupApi, Groups } from '../groupRepository';
import eventRepository, {
  Events,
  formatEventApi,
  GroupHousingEvents
} from '../eventRepository';
import { EventApi } from '~/models/EventApi';
import { GroupApi } from '~/models/GroupApi';
import {
  Establishments,
  formatEstablishmentApi
} from '../establishmentRepository';
import { formatUserApi, Users } from '../userRepository';

describe('Event repository', () => {
  describe('findGroupHousingEvents', () => {
    const establishment = genEstablishmentApi();
    const user = genUserApi(establishment.id);

    beforeAll(async () => {
      await Establishments().insert(formatEstablishmentApi(establishment));
      await Users().insert(formatUserApi(user));
    });

    it('should return events linked to a group and a housing', async () => {
      const houses = Array.from({ length: 3, }).map(() =>
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
        createdBy: user.id,
      }));
      const groupHousingEvents = houses.map((housing, i) => ({
        event_id: events[i].id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
        group_id: group.id,
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
});
