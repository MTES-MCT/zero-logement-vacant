import { v4 as uuidv4 } from 'uuid';
import { genGroupApi, genHousingApi, oneOf } from '../../test/testFixtures';
import { User1 } from '../../../database/seeds/test/003-users';
import { Establishment1 } from '../../../database/seeds/test/001-establishments';
import { formatHousingRecordApi, Housing } from '../housingRepository';
import { formatGroupApi, Groups } from '../groupRepository';
import eventRepository, {
  Events,
  formatEventApi,
  GroupHousingEvents,
} from '../eventRepository';
import { EventApi } from '../../models/EventApi';
import { GroupApi } from '../../models/GroupApi';

describe('Event repository', () => {
  describe('findGroupHousingEvents', () => {
    it('should return events linked to a group and a housing', async () => {
      const housingList = new Array(3)
        .fill('0')
        .map(() => genHousingApi(oneOf(Establishment1.geoCodes)));
      const group = genGroupApi(User1, Establishment1);
      const events: EventApi<GroupApi>[] = housingList.map(() => ({
        id: uuidv4(),
        name: 'Ce logement a été ajouté à un groupe',
        kind: 'Create',
        category: 'Group',
        section: 'Ajout d’un logement dans un groupe',
        conflict: false,
        old: undefined,
        new: group,
        createdAt: new Date(),
        createdBy: User1.id,
      }));
      const groupHousingEvents = housingList.map((housing, i) => ({
        event_id: events[i].id,
        housing_geo_code: housing.geoCode,
        housing_id: housing.id,
        group_id: group.id,
      }));
      await Housing().insert(housingList.map(formatHousingRecordApi));
      await Groups().insert(formatGroupApi(group));
      await Events().insert(events.map(formatEventApi));
      await GroupHousingEvents().insert(groupHousingEvents);

      const actual = await eventRepository.findGroupHousingEvents(
        housingList[0],
        group
      );

      expect(actual).toBeArrayOfSize(1);
    });
  });
});
