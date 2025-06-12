import { faker } from '@faker-js/faker/locale/fr';
import { PrecisionCategory } from '@zerologementvacant/models';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import { PRECISION_TREE_VALUES, PrecisionApi } from '~/models/PrecisionApi';
import { Establishments } from '~/repositories/establishmentRepository';
import { Housing } from '~/repositories/housingRepository';
import {
  HOUSING_PRECISION_TABLE,
  HousingPrecisionDBO,
  Precisions
} from '~/repositories/precisionRepository';

const PRECISION_TABLE = 'precisions';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw(`TRUNCATE TABLE ${PRECISION_TABLE} CASCADE`);

  const precisions: ReadonlyArray<PrecisionApi> =
    PRECISION_TREE_VALUES.mapEntries(([category, labels]) => [
      category,
      labels.map<PrecisionApi>((label, index) => ({
        id: uuidv4(),
        category: category as PrecisionCategory,
        label: label,
        order: index + 1
      }))
    ])
      .toList()
      .flatMap((_) => _)
      .toArray();
  console.log(`Inserting ${precisions.length} precisions...`);
  await Precisions(knex).insert(precisions);

  // Attach precisions to some housings
  const establishments = await Establishments(knex).where({ available: true });
  const geoCodes: ReadonlyArray<string> = establishments.flatMap(
    (establishment) => establishment.localities_geo_code
  );
  const housings = await Housing(knex)
    .whereIn('geo_code', geoCodes)
    .limit(2_000);
  const housingPrecisions: ReadonlyArray<HousingPrecisionDBO> = housings
    .map((housing) => {
      const slice = faker.helpers.arrayElements(precisions, {
        min: 1,
        max: 3
      });
      return slice.map<HousingPrecisionDBO>((precision) => ({
        precision_id: precision.id,
        housing_geo_code: housing.geo_code,
        housing_id: housing.id,
        created_at: faker.date.past()
      }));
    })
    .flat();

  console.log('Linking precisions to housings...', {
    precisions: precisions.length,
    housings: housingPrecisions.length
  });
  await knex.batchInsert(HOUSING_PRECISION_TABLE, housingPrecisions);
}
