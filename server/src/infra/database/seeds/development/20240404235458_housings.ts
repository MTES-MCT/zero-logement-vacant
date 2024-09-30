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

  async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function tryGenHousingApi(establishment: any, maxAttempts = 3): Promise<HousingApi> {
    let attempts = 0;
    let lastError: any;
  
    while (attempts < maxAttempts) {
      attempts += 1;
      const geoCode = faker.helpers.arrayElement(establishment.localities_geo_code) as string;
      try {
        return await genHousingApi(geoCode);
      } catch (error) {
        lastError = error;
        console.log(`Tentative ${attempts} échouée avec geoCode ${geoCode}.`);
      }
      await delay(200);
    }

    throw new Error(`Échec après ${maxAttempts} tentatives : ${lastError}`);
  }

  await async.forEachSeries(establishments, async (establishment) => {
    const housings: ReadonlyArray<HousingApi> = await Promise.all(faker.helpers.multiple(
      async () =>
        await tryGenHousingApi(establishment, 3),
      {
        count: {
          min: 30,
          max: 100
        }
      }
    ));
    const housingOwners: ReadonlyArray<HousingOwnerApi> = (await Promise.all(housings.flatMap(
      async (housing) => {
        const geoCode = '67268';
        const owners = await Promise.all(faker.helpers.multiple(() => genOwnerApi(geoCode), {
          count: {
            min: 1,
            max: 6
          }
        }));
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
    ))).flat();
    const owners: ReadonlyArray<OwnerApi> = housingOwners.flat();

    await knex.batchInsert(housingTable, housings.map(formatHousingRecordApi));
    await knex.batchInsert(ownerTable, owners.map(formatOwnerApi));
    await knex.batchInsert(
      housingOwnersTable,
      housingOwners.map(formatHousingOwnerApi)
    );
  });
}
