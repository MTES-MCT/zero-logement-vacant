import fs from 'node:fs';
import readline from 'node:readline';

import { chunksOf } from 'effect/Array';

import {
  startTransaction,
  withinTransaction
} from '~/infra/database/transaction';
import eventRepository, {
  Events,
  HousingEvents
} from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';

import type { ApplySummary, PlanRow } from './types';

export async function apply(planFile: string): Promise<ApplySummary> {
  const rows = await readPlan(planFile);

  if (rows.length === 0) {
    return { updated: 0, eventsDeleted: 0, eventsCreated: 0 };
  }

  const groups = groupByPayload(rows);
  const allDeleteIds = rows.flatMap((r) => r.deleteEventIds ?? []);
  const allCreateEvents = rows.flatMap((r) => r.createEvents ?? []);

  let updated = 0;

  await startTransaction(async () => {
    for (const group of groups) {
      if (!group.payload || Object.keys(group.payload).length === 0) continue;
      for (const chunk of chunksOf(group.rows, 1000)) {
        await housingRepository.updateMany(
          chunk.map((r) => ({ id: r.housingId, geoCode: r.housingGeoCode })),
          group.payload
        );
        updated += chunk.length;
      }
    }

    if (allDeleteIds.length > 0) {
      for (const chunk of chunksOf(allDeleteIds, 1000)) {
        await withinTransaction(async (transaction) => {
          await HousingEvents(transaction).whereIn('event_id', chunk).delete();
          await Events(transaction).whereIn('id', chunk).delete();
        });
      }
    }

    if (allCreateEvents.length > 0) {
      for (const chunk of chunksOf(allCreateEvents, 1000)) {
        await eventRepository.insertManyHousingEvents(chunk);
      }
    }
  });

  return {
    updated,
    eventsDeleted: allDeleteIds.length,
    eventsCreated: allCreateEvents.length
  };
}

async function readPlan(planFile: string): Promise<PlanRow[]> {
  const rows: PlanRow[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(planFile),
    crlfDelay: Infinity
  });
  for await (const line of rl) {
    if (line.trim()) rows.push(JSON.parse(line) as PlanRow);
  }
  return rows;
}

interface PayloadGroup {
  payload: PlanRow['update'];
  rows: PlanRow[];
}

function groupByPayload(rows: PlanRow[]): PayloadGroup[] {
  const map = new Map<string, PayloadGroup>();
  for (const row of rows) {
    const key = JSON.stringify(row.update ?? null);
    if (!map.has(key)) {
      map.set(key, { payload: row.update, rows: [] });
    }
    map.get(key)!.rows.push(row);
  }
  return Array.from(map.values());
}
