import fs from 'node:fs';
import readline from 'node:readline';

import { compactUndefined } from '@zerologementvacant/utils';
import { chunksOf } from 'effect/Array';

import db from '~/infra/database';
import {
  Events,
  formatEventApi,
  formatHousingEventApi,
  HousingEvents
} from '~/repositories/eventRepository';
import { Housing } from '~/repositories/housingRepository';
import {
  disableHousingsTriggers,
  enableHousingsTriggers,
  ensureKnownHousingsTriggers,
  recomputeHousingsCounts
} from '~/scripts/import-lovac/infra/housings-counts-maintenance';

import type { ApplySummary, PlanRow } from './types';

export interface ApplyOptions {
  /**
   * Bypass the `fast_housing` / `housing_events` count triggers: disable them,
   * apply the plan, recompute the counts once, then re-enable them — all inside
   * the transaction. Skips the per-row trigger fires that dominate large
   * repairs, at the cost of holding an exclusive lock on `fast_housing` and a
   * full counts recompute. Defaults to `false`.
   */
  bypassTriggers?: boolean;
}

export async function apply(
  planFile: string,
  options: ApplyOptions = {}
): Promise<ApplySummary> {
  const bypassTriggers = options.bypassTriggers ?? false;
  const rows = await readPlan(planFile);

  if (rows.length === 0) {
    return { updated: 0, eventsDeleted: 0, eventsCreated: 0 };
  }

  const groups = groupByPayload(rows);
  const allDeleteIds = rows.flatMap((row) => row.deleteEventIds ?? []);
  const allCreateEvents = rows.flatMap((row) => row.createEvents ?? []);

  // Fail fast (before taking any lock) if a trigger we can't compensate for
  // appeared on the managed tables.
  if (bypassTriggers) {
    await ensureKnownHousingsTriggers();
  }

  let updated = 0;
  // A repair is a reviewed, point-in-time operation. The writes below use the
  // table accessors and pure formatters directly — never the repository
  // *methods* — so a future change to a repository method (a new filter, a side
  // effect, a different onConflict) cannot silently alter what an applied plan
  // does. For the same reason the script owns its transaction with
  // `db.transaction` rather than the app's AsyncLocalStorage helpers.
  await db.transaction(async (transaction) => {
    // Disabling the triggers *inside* the transaction is what makes an early
    // exit safe. `ALTER TABLE ... DISABLE TRIGGER` is transactional, so if the
    // process is interrupted (Ctrl-C / SIGINT, SIGTERM, even SIGKILL, a crash
    // or the DB connection dropping) the whole transaction — including the
    // disable — rolls back and the triggers are never left off. It also holds
    // ACCESS EXCLUSIVE on fast_housing, so concurrent writers block rather than
    // silently skipping the triggers. Both are impossible if the disable is a
    // separate, already-committed statement.
    if (bypassTriggers) {
      await disableHousingsTriggers(transaction);
    }

    for (const group of groups) {
      if (!group.payload) continue;
      const fields = toHousingColumns(group.payload);
      if (Object.keys(fields).length === 0) continue;

      for (const chunk of chunksOf(group.rows, 1000)) {
        // Tuple WHERE on the (geo_code, id) primary key — PostgreSQL prunes it
        // to the touched partitions.
        await Housing(transaction)
          .whereIn(
            ['geo_code', 'id'],
            chunk.map((row) => [row.housingGeoCode, row.housingId])
          )
          .update(fields);
        updated += chunk.length;
      }
    }

    if (allDeleteIds.length > 0) {
      for (const chunk of chunksOf(allDeleteIds, 1000)) {
        await HousingEvents(transaction).whereIn('event_id', chunk).delete();
        await Events(transaction).whereIn('id', chunk).delete();
      }
    }

    if (allCreateEvents.length > 0) {
      for (const chunk of chunksOf(allCreateEvents, 1000)) {
        await Events(transaction)
          .insert(chunk.map(formatEventApi))
          .onConflict('id')
          .ignore();
        await HousingEvents(transaction)
          .insert(chunk.map(formatHousingEventApi))
          .onConflict('event_id')
          .ignore();
      }
    }

    // Recompute the derived counts once, then re-enable before commit so the
    // committed catalog state has the triggers back on.
    if (bypassTriggers) {
      await recomputeHousingsCounts(transaction);
      await enableHousingsTriggers(transaction);
    }
  });

  return {
    updated,
    eventsDeleted: allDeleteIds.length,
    eventsCreated: allCreateEvents.length
  };
}

/**
 * Map the plan's API-shaped update to explicit `fast_housing` columns, dropping
 * undefined so only the fields the plan set are written. Owned here rather than
 * delegated to `housingRepository.updateMany` so a repository change cannot
 * silently alter what a reviewed repair writes.
 */
function toHousingColumns(update: NonNullable<PlanRow['update']>) {
  return compactUndefined({
    status: update.status,
    sub_status: update.subStatus,
    occupancy: update.occupancy,
    occupancy_intended: update.occupancyIntended
  });
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
