import { Knex } from 'knex';
import { genGroupApi, genNumber } from '../../../server/test/testFixtures';
import {
  formatGroupApi,
  GroupHousingDBO,
  groupsHousingTable,
  groupsTable,
} from '../../../server/repositories/groupRepository';
import {
  parseUserApi,
  UserDBO,
  usersTable,
} from '../../../server/repositories/userRepository';
import {
  establishmentsTable,
  parseEstablishmentApi,
} from '../../../server/repositories/establishmentRepository';
import async from 'async';
import { housingTable } from '../../../server/repositories/housingRepository';
import fp from 'lodash/fp';

exports.seed = async function (knex: Knex) {
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

    const groups = new Array(genNumber(1))
      .fill('0')
      .map(() =>
        genGroupApi(parseUserApi(user), parseEstablishmentApi(establishment))
      )
      .map(formatGroupApi);

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

    await knex(groupsTable).insert(groups);
    await knex(groupsHousingTable).insert(groupsHousing);
  });
};
