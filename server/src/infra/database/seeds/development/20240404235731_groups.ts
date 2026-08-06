import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { Knex } from 'knex';

import {
  EstablishmentDBO,
  establishmentsTable,
  parseEstablishmentApi
} from '~/repositories/establishmentRepository';
import {
  formatGroupApi,
  GroupDBO,
  GroupHousingDBO,
  GROUPS_HOUSING_TABLE,
  GROUPS_TABLE
} from '~/repositories/groupRepository';
import { HousingDBO, housingTable } from '~/repositories/housingRepository';
import {
  fromUserDBO,
  USERS_TABLE,
  UserDBO
} from '~/repositories/userRepository';
import { genGroupApi } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404235731_groups');
  await knex<GroupHousingDBO>(GROUPS_HOUSING_TABLE).delete();
  await knex<GroupDBO>(GROUPS_TABLE).delete();

  const establishments = await knex<EstablishmentDBO>(
    establishmentsTable
  ).where({ available: true });
  await async.forEachSeries(establishments, async (establishment) => {
    const [users, housings] = await Promise.all([
      knex<UserDBO>(USERS_TABLE).where({ establishment_id: establishment.id }),
      knex<HousingDBO>(housingTable)
        .whereIn('geo_code', establishment.localities_geo_code)
        .limit(2000)
    ]);

    const groups = faker.helpers.multiple(
      () => {
        const creator = faker.helpers.arrayElement(users);
        return genGroupApi(
          fromUserDBO(creator),
          parseEstablishmentApi(establishment)
        );
      },
      {
        count: { min: 2, max: 5 }
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
    await knex.batchInsert(GROUPS_TABLE, groups.map(formatGroupApi));
    console.log(`Linking ${groupHousings.length} housings to groups...`);
    await knex.batchInsert(GROUPS_HOUSING_TABLE, groupHousings);
  });
  console.timeEnd('20240404235731_groups');
  console.log('\n');
}
