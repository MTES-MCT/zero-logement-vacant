import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { Knex } from 'knex';

import {
  Establishments,
  parseEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatGroupApi,
  GroupHousingDBO,
  Groups,
  GroupsHousing,
  groupsHousingTable,
  groupsTable
} from '~/repositories/groupRepository';
import { Housing } from '~/repositories/housingRepository';
import { parseUserApi, Users } from '~/repositories/userRepository';
import { genGroupApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  await GroupsHousing(knex).delete();
  await Groups(knex).delete();

  const establishments = await Establishments(knex).where({ available: true });
  await async.forEach(establishments, async (establishment) => {
    const [users, housings] = await Promise.all([
      Users(knex).where({ establishment_id: establishment.id }),
      Housing(knex)
        .whereIn('geo_code', establishment.localities_geo_code)
        .limit(2000)
    ]);

    const groups = faker.helpers.multiple(
      () => {
        const creator = faker.helpers.arrayElement(users);
        return genGroupApi(
          parseUserApi(creator),
          parseEstablishmentApi(establishment)
        );
      },
      {
        count: { min: 1, max: 5 }
      }
    );
    const groupHousings = groups.flatMap((group) => {
      return faker.helpers
        .arrayElements(housings, {
          min: 1,
          max: 100
        })
        .map<GroupHousingDBO>((housing) => ({
          group_id: group.id,
          housing_id: housing.id,
          housing_geo_code: housing.geo_code
        }));
    });

    console.log('Inserting groups...', {
      establishment: establishment.name,
      groups: groups.length,
      housings: groupHousings.length
    });
    await knex.batchInsert(groupsTable, groups.map(formatGroupApi));
    await knex.batchInsert(groupsHousingTable, groupHousings);
  });
}
