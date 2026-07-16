import { Writable } from 'node:stream';

import { readPlan } from './read-plan';
import type { PlanRow, PlanSummary } from './types';

export async function stats(
  planFile: string
): Promise<Pick<PlanSummary, 'planned' | 'eventsToDelete' | 'eventsToCreate'>> {
  let planned = 0;
  let eventsToDelete = 0;
  let eventsToCreate = 0;

  await readPlan(
    planFile,
    new Writable({
      objectMode: true,
      write(row: PlanRow, _encoding, callback) {
        planned++;
        eventsToDelete += row.deleteEventIds?.length ?? 0;
        eventsToCreate += row.createEvents?.length ?? 0;
        callback();
      }
    })
  );

  return { planned, eventsToDelete, eventsToCreate };
}
