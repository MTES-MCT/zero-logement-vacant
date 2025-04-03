import { chunkify, tap } from '@zerologementvacant/utils/node';
import { Bar } from 'cli-progress';
import { Readable } from 'node:stream';
import { ReadableStream, WritableStream } from 'node:stream/web';
import db from '~/infra/database';

import { housingTable } from '~/repositories/housingRepository';

const CHUNK_SIZE = 10_000;
const TOTAL = 39_048_568;
const TEMPORARY_TABLE = 'buildings_housing_updates';

async function run(): Promise<void> {
  const progress = new Bar({
    fps: 4,
    etaAsynchronousUpdate: true,
    etaBuffer: 1000,
    stopOnComplete: true
  });
  progress.start(TOTAL, 0);

  await createTemporaryTableStream()
    .pipeThrough(
      chunkify({
        size: CHUNK_SIZE
      })
    )
    .pipeThrough(saver())
    .pipeThrough(
      tap((chunk) => {
        progress.increment(chunk.length);
      })
    )
    .pipeTo(reporter());
}

interface Input {
  idbat: string;
  idlocal: string;
  geocode: string;
}

function createTemporaryTableStream(): ReadableStream<Input> {
  return Readable.toWeb(db(TEMPORARY_TABLE).select().stream());
}

function saver() {
  return tap<ReadonlyArray<Input>>(async (chunk) => {
    await db.transaction(async (transaction) => {
      await transaction(housingTable)
        .update({
          building_id: db.ref(`${TEMPORARY_TABLE}.idbat`)
        })
        .updateFrom(TEMPORARY_TABLE)
        .where(`${housingTable}.local_id`, db.ref(`${TEMPORARY_TABLE}.idlocal`))
        .where(`${housingTable}.geo_code`, db.ref(`${TEMPORARY_TABLE}.geocode`))
        .whereIn(
          `${TEMPORARY_TABLE}.idlocal`,
          chunk.map((building) => building.idlocal)
        );
    });
  });
}

function reporter<A>() {
  let total = 0;

  return new WritableStream<ReadonlyArray<A>>({
    write(chunk) {
      total += chunk.length;
    },
    close() {
      console.log(`Total saved: ${total}`);
    }
  });
}

run();
