import { faker } from '@faker-js/faker/locale/fr';
import async from 'async';
import { Knex } from 'knex';

import { Establishments } from '~/repositories/establishmentRepository';
import { HousingApi } from '~/models/HousingApi';
import { genHousingApi, genOwnerApi } from '~/test/testFixtures';
import {
  formatHousingRecordApi,
  housingTable
} from '~/repositories/housingRepository';
import { OwnerApi } from '~/models/OwnerApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { formatOwnerApi, ownerTable } from '~/repositories/ownerRepository';
import {
  formatHousingOwnerApi,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';

export async function seed(knex: Knex): Promise<void> {
  const establishments = await Establishments(knex).where({ available: true });

  await async.forEachSeries(establishments, async (establishment) => {
    const housings: ReadonlyArray<HousingApi> = faker.helpers.multiple(
      () =>
        genHousingApi(
          faker.helpers.arrayElement(establishment.localities_geo_code)
        ),
      {
        count: {
          min: 100,
          max: 10000
        }
      }
    );
    const housingOwners: ReadonlyArray<HousingOwnerApi> = housings.flatMap(
      (housing) => {
        const owners = faker.helpers.multiple(() => genOwnerApi(), {
          count: {
            min: 1,
            max: 6
          }
        });
        const archivedOwners: ReadonlyArray<HousingOwnerApi> = [];

        return owners
          .map<HousingOwnerApi>((owner, index) => ({
            ...owner,
            ownerId: owner.id,
            housingGeoCode: housing.geoCode,
            housingId: housing.id,
            rank: index + 1
          }))
          .concat(archivedOwners);
      }
    );
    const owners: ReadonlyArray<OwnerApi> = housingOwners.flat();

    await knex.batchInsert(housingTable, housings.map(formatHousingRecordApi));
    await knex.batchInsert(ownerTable, owners.map(formatOwnerApi));
    await knex.batchInsert(
      housingOwnersTable,
      housingOwners.map(formatHousingOwnerApi)
    );
  });
}
