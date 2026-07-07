import { faker } from '@faker-js/faker/locale/fr';

import { startTransaction } from '~/infra/database/transaction';
import { HousingApi } from '~/models/HousingApi';
import {
  formatHousingRecordApi,
  Housing
} from '~/repositories/housingRepository';
import precisionRepository, {
  HousingPrecisions,
  Precisions
} from '~/repositories/precisionRepository';
import { genHousingApi } from '~/test/testFixtures';

describe('Transaction bridge — precision link atomicity', () => {
  let housing: HousingApi;

  beforeEach(async () => {
    housing = genHousingApi();
    await Housing().insert(formatHousingRecordApi(housing));
  });

  it('rolls back the Kysely precision link when the surrounding transaction fails', async () => {
    const referential = await Precisions();
    const precisions = faker.helpers.arrayElements(referential, 2);

    await expect(
      startTransaction(async () => {
        await precisionRepository.link(housing, precisions);
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    const actual = await HousingPrecisions().where({
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });
    expect(actual).toHaveLength(0);
  });

  it('commits the precision link when the surrounding transaction succeeds', async () => {
    const referential = await Precisions();
    const precisions = faker.helpers.arrayElements(referential, 2);

    await startTransaction(async () => {
      await precisionRepository.link(housing, precisions);
    });

    const actual = await HousingPrecisions().where({
      housing_geo_code: housing.geoCode,
      housing_id: housing.id
    });
    expect(actual).toHaveLength(precisions.length);
  });
});
