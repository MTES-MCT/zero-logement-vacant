import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import { PrecisionCategory } from '@zerologementvacant/models';
import { PRECISION_TREE_VALUES, PrecisionApi } from '~/models/PrecisionApi';

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

  await knex(PRECISION_TABLE).insert(precisions);
}
