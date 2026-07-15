import fs from 'node:fs';
import path from 'node:path';

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

  // Query before opening the output files: `createWriteStream` truncates in
  // 'w' mode, so opening first would wipe a previously reviewed plan if
  // `query()` then throws.
  const housings = await repair.query();

  const planStream = fs.createWriteStream(path.join(outDir, 'plan.jsonl'));
  const skippedStream = fs.createWriteStream(
    path.join(outDir, 'skipped.jsonl')
  );
  const errorsStream = fs.createWriteStream(path.join(outDir, 'errors.jsonl'));

  let planned = 0;
  let skipped = 0;
  let errors = 0;
  let eventsToDelete = 0;
  let eventsToCreate = 0;
  const planRows: PlanRow[] = [];

  try {
    housings.forEach((housing) => {
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
        planRows.push({
          housingId: housing.id,
          housingGeoCode: housing.geoCode,
          ...decision
        });
        planned++;
        eventsToDelete += decision.deleteEventIds?.length ?? 0;
        eventsToCreate += decision.createEvents?.length ?? 0;
      }
    });

    // Order plan.jsonl by update payload so same-payload rows are contiguous:
    // `apply` streams the file and batches one UPDATE per payload run, so it
    // never has to hold the whole plan in memory to group it.
    planRows.sort((a, b) => {
      const keyA = payloadKey(a);
      const keyB = payloadKey(b);
      return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
    });
    planRows.forEach((row) => {
      planStream.write(JSON.stringify(row) + '\n');
    });
  } finally {
    await Promise.all([
      streamEnd(planStream),
      streamEnd(skippedStream),
      streamEnd(errorsStream)
    ]);
  }

  return {
    total: housings.length,
    planned,
    skipped,
    errors,
    eventsToDelete,
    eventsToCreate
  };
}

function payloadKey(row: PlanRow): string {
  return JSON.stringify(row.update ?? null);
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
