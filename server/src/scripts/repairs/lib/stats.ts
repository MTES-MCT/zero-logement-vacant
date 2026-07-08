import fs from 'node:fs';
import readline from 'node:readline';

import type { PlanRow, PlanSummary } from './types';

export async function stats(
  planFile: string
): Promise<Pick<PlanSummary, 'planned' | 'eventsToDelete' | 'eventsToCreate'>> {
  const rl = readline.createInterface({
    input: fs.createReadStream(planFile),
    crlfDelay: Infinity
  });
  let planned = 0,
    eventsToDelete = 0,
    eventsToCreate = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as PlanRow;
    planned++;
    eventsToDelete += row.deleteEventIds?.length ?? 0;
    eventsToCreate += row.createEvents?.length ?? 0;
  }

  return { planned, eventsToDelete, eventsToCreate };
}
