/**
 * Charge les ~500 000 logements de l'exercice "import RS" depuis
 * `data/common/housings.jsonl.gz` (pré-généré et committé, même convention
 * que les autres fixtures de base — establishments.csv, localities.csv).
 *
 * Le fichier est régénéré côté recruteur via :
 *     yarn workspace @zerologementvacant/server tsx src/scripts/recruitment/generate-fixtures.ts
 */

import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { Knex } from 'knex';

import {
  housingTable,
  type HousingRecordDBO
} from '~/repositories/housingRepository';

const FIXTURE_PATH = path.resolve(
  import.meta.dirname,
  '../../data/common/housings.jsonl.gz'
);
const BATCH_SIZE = 1_000;

export async function seed(knex: Knex): Promise<void> {
  console.time('20240404235459_housings');

  await knex.raw(`TRUNCATE TABLE ${housingTable} CASCADE`);

  const lines = createInterface({
    input: createReadStream(FIXTURE_PATH).pipe(createGunzip()),
    crlfDelay: Infinity
  });

  let buffer: HousingRecordDBO[] = [];
  let total = 0;

  for await (const line of lines) {
    if (!line) continue;
    buffer.push(JSON.parse(line));
    if (buffer.length >= BATCH_SIZE) {
      await knex.batchInsert(housingTable, buffer as object[], BATCH_SIZE);
      total += buffer.length;
      buffer = [];
      if (total % 50_000 === 0) {
        process.stderr.write(`  housings ${total.toLocaleString('fr-FR')}\n`);
      }
    }
  }
  if (buffer.length > 0) {
    await knex.batchInsert(housingTable, buffer as object[], BATCH_SIZE);
    total += buffer.length;
  }

  console.log(`  → ${total.toLocaleString('fr-FR')} housings insérés`);
  console.timeEnd('20240404235459_housings');
}
