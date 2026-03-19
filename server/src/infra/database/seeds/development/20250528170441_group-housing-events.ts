import { faker } from '@faker-js/faker/locale/fr';
import { Knex } from 'knex';

import { GroupHousingEventApi } from '~/models/EventApi';
import {
  EVENTS_TABLE,
  formatEventApi,
  formatGroupHousingEventApi,
  GROUP_HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import { GroupHousingDBO, GroupsHousing } from '~/repositories/groupRepository';
import { genEventApi } from '~/test/testFixtures';

import { batchedWhereIn, getAdmin, getHousings } from './lib/events-helpers';

export async function seed(knex: Knex): Promise<void> {
  console.time('20250528170441_group-housing-events');
  const admin = await getAdmin(knex);
  const { housingKeys } = await getHousings(knex);

  const groupHousings: ReadonlyArray<GroupHousingDBO> =
    await batchedWhereIn<GroupHousingDBO>(
      knex,
      (k) => GroupsHousing(k),
      ['housing_geo_code', 'housing_id'],
      housingKeys
    );

  const groupHousingEvents: ReadonlyArray<GroupHousingEventApi> = faker.helpers
    .arrayElements(groupHousings)
    .flatMap((groupHousing): GroupHousingEventApi[] => {
      return [
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:group-attached',
            nextOld: null,
            nextNew: {
              name: faker.company.name()
            }
          }),
          groupId: groupHousing.group_id,
          housingGeoCode: groupHousing.housing_geo_code,
          housingId: groupHousing.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:group-detached',
            nextOld: {
              name: faker.company.name()
            },
            nextNew: null
          }),
          groupId: groupHousing.group_id,
          housingGeoCode: groupHousing.housing_geo_code,
          housingId: groupHousing.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:group-archived',
            nextOld: {
              name: faker.company.name()
            },
            nextNew: null
          }),
          groupId: groupHousing.group_id,
          housingGeoCode: groupHousing.housing_geo_code,
          housingId: groupHousing.housing_id
        },
        {
          ...genEventApi({
            creator: admin,
            type: 'housing:group-removed',
            nextOld: {
              name: faker.company.name()
            },
            nextNew: null
          }),
          groupId: groupHousing.group_id,
          housingGeoCode: groupHousing.housing_geo_code,
          housingId: groupHousing.housing_id
        }
      ];
    });

  console.log(`Inserting ${groupHousingEvents.length} group housing events...`);
  await knex.batchInsert(EVENTS_TABLE, groupHousingEvents.map(formatEventApi));
  console.log(
    `Linking ${groupHousingEvents.length} events to housings and groups...`
  );
  await knex.batchInsert(
    GROUP_HOUSING_EVENTS_TABLE,
    groupHousingEvents.map(formatGroupHousingEventApi)
  );
  console.timeEnd('20250528170441_group-housing-events');
  console.log('\n')
}
