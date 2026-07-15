import fs from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { HousingApi } from '~/models/HousingApi';

import type {
  ErrorRow,
  PlanRow,
  PlanSummary,
  Repair,
  RepairAction,
  RepairError,
  RepairSkip,
  SkippedRow
} from './types';

export interface PlanOptions {
  outDir?: string;
}

export async function plan<H extends HousingApi>(
  repair: Repair<H>,
  options: PlanOptions = {}
): Promise<PlanSummary> {
  const outDir = options.outDir ?? process.cwd();

  // Write to temp files and promote them only once everything succeeds, so a
  // query that errors (or a mid-stream failure) never clobbers a previously
  // reviewed plan — `query()` now returns a stream, so there is no pre-open
  // point at which we know it will succeed.
  const targets = {
    plan: path.join(outDir, 'plan.jsonl'),
    skipped: path.join(outDir, 'skipped.jsonl'),
    errors: path.join(outDir, 'errors.jsonl')
  };
  const temps = {
    plan: `${targets.plan}.tmp`,
    skipped: `${targets.skipped}.tmp`,
    errors: `${targets.errors}.tmp`
  };
  const planStream = fs.createWriteStream(temps.plan);
  const skippedStream = fs.createWriteStream(temps.skipped);
  const errorsStream = fs.createWriteStream(temps.errors);

  let total = 0;
  let planned = 0;
  let skipped = 0;
  let errors = 0;
  let eventsToDelete = 0;
  let eventsToCreate = 0;

  // Stream the candidate housings through a decider: no sort, so the plan is in
  // query order (`apply` batches contiguous same-payload runs and is correct
  // regardless of ordering).
  const decider = new Writable({
    objectMode: true,
    write(housing: H, _encoding, callback) {
      total++;
      const decision = repair.decide(housing);
      if (isSkip(decision)) {
        const row: SkippedRow = {
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        };
        skippedStream.write(JSON.stringify(row) + '\n');
        skipped++;
      } else if (isError(decision)) {
        const row: ErrorRow = {
          housingId: housing.id,
          housingGeoCode: housing.geoCode,
          reason: decision.reason
        };
        errorsStream.write(JSON.stringify(row) + '\n');
        errors++;
      } else {
        const row: PlanRow = {
          housingId: housing.id,
          housingGeoCode: housing.geoCode,
          ...decision
        };
        planStream.write(JSON.stringify(row) + '\n');
        planned++;
        eventsToDelete += decision.deleteEventIds?.length ?? 0;
        eventsToCreate += decision.createEvents?.length ?? 0;
      }
      callback();
    }
  });

  try {
    await pipeline(repair.query(), decider);
    await Promise.all([
      streamEnd(planStream),
      streamEnd(skippedStream),
      streamEnd(errorsStream)
    ]);
    await Promise.all([
      rename(temps.plan, targets.plan),
      rename(temps.skipped, targets.skipped),
      rename(temps.errors, targets.errors)
    ]);
  } catch (error) {
    planStream.destroy();
    skippedStream.destroy();
    errorsStream.destroy();
    await Promise.allSettled([
      unlink(temps.plan),
      unlink(temps.skipped),
      unlink(temps.errors)
    ]);
    throw error;
  }

  return {
    total,
    planned,
    skipped,
    errors,
    eventsToDelete,
    eventsToCreate
  };
}

function isSkip(
  decision: RepairAction | RepairSkip | RepairError
): decision is RepairSkip {
  return 'action' in decision && decision.action === 'skip';
}

function isError(
  decision: RepairAction | RepairSkip | RepairError
): decision is RepairError {
  return 'action' in decision && decision.action === 'error';
}

function streamEnd(stream: fs.WriteStream): Promise<void> {
  return new Promise((resolve, reject) =>
    stream.end((err: Error | null | undefined) =>
      err ? reject(err) : resolve()
    )
  );
}
