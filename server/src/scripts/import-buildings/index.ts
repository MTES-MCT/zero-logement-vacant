import { chunkify, map, tap } from '@zerologementvacant/utils/node';
import { Bar } from 'cli-progress';
import { parse as parseJSONL } from 'jsonlines';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { ReadableStream, WritableStream } from 'node:stream/web';

import { BuildingApi } from '~/models/BuildingApi';
import buildingRepository from '~/repositories/buildingRepository';

const CHUNK_SIZE = 1_000;
const TOTAL = 25_958_378;

async function run(): Promise<void> {
  const progress = new Bar({
    fps: 4,
    etaAsynchronousUpdate: true,
    etaBuffer: CHUNK_SIZE,
    stopOnComplete: true
  });
  progress.start(TOTAL, 0);

  const file = path.join(import.meta.dirname, 'buildings.jsonl');
  await stream(file)
    .pipeThrough(mapper())
    .pipeThrough(chunkify({ size: CHUNK_SIZE }))
    .pipeThrough(saver())
    .pipeThrough(
      tap((buildings) => {
        progress.increment(buildings.length);
      })
    )
    .pipeTo(reporter());
}

interface Input {
  idbat: string;
  nlogh: number;
  rnb_id: string | null;
  rnb_id_score: number;
}

function stream(file: string): ReadableStream<Input> {
  const fileStream = fs.createReadStream(file);
  return Readable.toWeb(
    fileStream.pipe(
      parseJSONL({
        emitInvalidLines: true
      })
    )
  );
}

function mapper() {
  return map<Input, BuildingApi>((building) => ({
    id: building.idbat,
    housingCount: building.nlogh,
    rnbId: building.rnb_id,
    rnbIdScore: building.rnb_id_score,
    rentHousingCount: 0,
    vacantHousingCount: 0,
    dpe: null,
    ges: null,
    heating: null,
    rnb: null
  }));
}

function saver() {
  return tap<ReadonlyArray<BuildingApi>>(async (buildings) => {
    await buildingRepository.saveMany(buildings, {
      onConflict: ['id'],
      merge: ['housing_count', 'rnb_id', 'rnb_id_score']
    });
  });
}

function reporter() {
  let total = 0;

  return new WritableStream<ReadonlyArray<BuildingApi>>({
    write(chunk) {
      total += chunk.length;
    },
    close() {
      console.log(`Total saved: ${total}`);
    }
  });
}

run();
