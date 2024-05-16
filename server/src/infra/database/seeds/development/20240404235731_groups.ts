import async from 'async';
import { Knex } from 'knex';
import fp from 'lodash/fp';

import {
  establishmentsTable,
  parseEstablishmentApi,
} from '~/repositories/establishmentRepository';
import {
  formatGroupApi,
  GroupHousingDBO,
  groupsHousingTable,
  groupsTable,
} from '~/repositories/groupRepository';
import { housingTable } from '~/repositories/housingRepository';
import {
  parseUserApi,
  UserDBO,
  usersTable,
} from '~/repositories/userRepository';
import { genGroupApi, genNumber } from '~/test/testFixtures';

export async function seed(knex: Knex): Promise<void> {
  const users: UserDBO[] = await knex(usersTable).whereIn('email', [
    'test.strasbourg@zlv.fr',
    'test.saintlo@zlv.fr',
  ]);

  await async.forEach(users, async (user: UserDBO) => {
    const establishment = await knex(establishmentsTable)
      .where('id', user.establishment_id)
      .first();

    const housingList = await knex(housingTable)
      .whereIn('geo_code', establishment.localities_geo_code)
      .limit(200);

    const groups = Array.from({ length: genNumber(1) }, () =>
      genGroupApi(parseUserApi(user), parseEstablishmentApi(establishment)),
    ).map(formatGroupApi);

    const groupsHousing = groups.flatMap((group) => {
      const takeRandom = fp.pipe(fp.shuffle, fp.take(genNumber(1)));

      const randomHousingList = takeRandom(housingList);
      return randomHousingList.map((housing: any): GroupHousingDBO => {
        return {
          group_id: group.id,
          housing_id: housing.id,
          housing_geo_code: housing.geo_code,
        };
      });
    });

    if (groups.length && groupsHousing.length) {
      await knex(groupsTable).insert(groups);
      await knex(groupsHousingTable).insert(groupsHousing);
    }
  });
}
