import { PrecisionCategory } from '@zerologementvacant/models';
import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

import { PRECISION_TREE_VALUES, PrecisionApi } from '~/models/PrecisionApi';
import { Precisions } from '~/repositories/precisionRepository';

const PRECISION_TABLE = 'precisions';

export async function seed(knex: Knex): Promise<void> {
  console.time('20250113145122_precisions');
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

  console.timeEnd('20250113145122_precisions');
  console.log('\n');
}
