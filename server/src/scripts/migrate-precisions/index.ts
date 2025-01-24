import { parse as parseJSONL, stringify as writeJSONL } from 'jsonlines';
import { List, Map } from 'immutable';
import fp from 'lodash/fp';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform, Writable } from 'node:stream';
import { ReadableStream, TransformStream } from 'node:stream/web';

import { PrecisionCategory } from '@zerologementvacant/models';
import { isNotNull } from '@zerologementvacant/utils';
import { HousingRecordDBO } from '~/repositories/housingRepository';
import { PrecisionDBO, Precisions } from '~/repositories/precisionRepository';

export async function run(): Promise<void> {
  const precisions = await Precisions().select().orderBy('category');

  const input = path.join(__dirname, 'input.jsonl');
  const output = path.join(__dirname, 'output.jsonl');

  await jsonlReader(input)
    .pipeThrough(mapFilter(precisions))
    .pipeThrough(jsonl())
    .pipeTo(toFile(output));
}

function jsonlReader(file: string): ReadableStream<MapInput> {
  const stream = fs.createReadStream(file, 'utf8');
  return Readable.toWeb(stream.pipe(parseJSONL()));
}

type MapInput = Required<
  Pick<HousingRecordDBO, 'geo_code' | 'id' | 'precisions'>
>;
type MapOutput = Omit<MapInput, 'precisions'> & {
  precisions: ReadonlyArray<PrecisionDBO['id']>;
};

function mapFilter(precisions: ReadonlyArray<PrecisionDBO>) {
  const precisionsByCategory = List(precisions).groupBy((p) => p.category);

  return new TransformStream<MapInput, MapOutput>({
    async transform(chunk, controller) {
      const matched: ReadonlyArray<PrecisionDBO['id']> = (
        chunk.precisions ?? []
      )
        .filter(isNotNull)
        .filter((precision) => precision.split(' > ').length === 3)
        .map((precisionBefore) => {
          const array = precisionBefore.split(' > ');
          const categoryBefore = array.slice(0, 2).join(' > ');
          const label = array.at(-1) as string;

          const mapping: Map<string, PrecisionCategory> = Map({
            'Dispositifs > Dispositifs incitatifs': 'dispositifs-incitatifs',
            'Dispositifs > Dispositifs coercitifs': 'dispositifs-coercitifs',
            'Dispositifs > Hors dispositif public': 'hors-dispositif-public',
            'Mode opératoire > Travaux': 'travaux',
            'Mode opératoire > Occupation': 'occupation',
            'Mode opératoire > Mutation': 'mutation',
            'Blocage > Blocage involontaire': 'blocage-involontaire',
            'Blocage > Blocage volontaire': 'blocage-volontaire',
            'Blocage > Immeuble / Environnement': 'immeuble-environnement',
            'Blocage > Tiers en cause': 'tiers-en-cause'
          });
          const categoryAfter = mapping.get(categoryBefore);
          if (!categoryAfter) {
            throw new Error(`Category missing to map from ${categoryBefore}`);
          }

          const precisionAfter = precisionsByCategory
            .get(categoryAfter)
            ?.find((precision) => precision.label === label);
          if (!precisionAfter) {
            throw new PrecisionNotFoundError(categoryAfter, label);
          }

          return precisionAfter;
        })
        .map((precision) => precision.id);

      if (matched.length > 0) {
        controller.enqueue({
          ...chunk,
          precisions: fp.uniq(matched)
        });
      }
    }
  });
}

function jsonl() {
  return Transform.toWeb(writeJSONL());
}

function toFile(file: string) {
  return Writable.toWeb(fs.createWriteStream(file, 'utf8'));
}

class PrecisionNotFoundError extends Error {
  constructor(category: string, label: string) {
    super(
      `Precision with category "${category}" and label "${label}" not found`
    );
  }
}

run()
  // .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
