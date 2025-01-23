import { parse as parseJSONL, stringify as writeJSONL } from 'jsonlines';
import { List } from 'immutable';
import fp from 'lodash/fp';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform, Writable } from 'node:stream';
import { ReadableStream, TransformStream } from 'node:stream/web';
import { match, P } from 'ts-pattern';

import { PrecisionCategory } from '@zerologementvacant/models';
import { isNotNull, slugify } from '@zerologementvacant/utils';
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
      const matched = chunk.precisions
        .filter(isNotNull)
        .map((precision) => {
          const array = precision.split(' > ').slice(-2);
          const category = array.at(0);
          const label = array.at(1);

          return match({
            category: category ? slugify(category) : null,
            label: label ?? null
          })
            .returnType<PrecisionDBO['id'] | null>()
            .when(
              ({ category, label }) => {
                return (
                  category &&
                  label &&
                  precisionsByCategory
                    .get(category as PrecisionCategory)
                    ?.some((p) => p.label === label)
                );
              },
              ({ category, label }) => {
                const precision = precisionsByCategory
                  .get(category as PrecisionCategory)
                  ?.find((p) => p.label === label);
                if (!precision) {
                  throw new PrecisionNotFoundError(
                    category as PrecisionCategory,
                    label as string
                  );
                }

                return precision.id;
              }
            )
            .with(
              { category: 'location-occupation', label: P.string },
              ({ label }) => {
                const precision = precisionsByCategory
                  .get('occupation')
                  ?.find((p) => p.label === label);
                if (!precision) {
                  throw new PrecisionNotFoundError('occupation', label);
                }

                return precision.id;
              }
            )
            .otherwise(() => null);
        })
        .filter(isNotNull);

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
