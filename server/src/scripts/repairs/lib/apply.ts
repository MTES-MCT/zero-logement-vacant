import { stat } from 'node:fs/promises';
import { Writable } from 'node:stream';

import { compactUndefined } from '@zerologementvacant/utils';
import { chunksOf } from 'effect/Array';

import db from '~/infra/database';
import type { HousingEventApi } from '~/models/EventApi';
import {
  Events,
  formatEventApi,
  formatHousingEventApi,
  HousingEvents
} from '~/repositories/eventRepository';
import { Housing, type HousingDBO } from '~/repositories/housingRepository';
import {
  disableHousingsTriggers,
  enableHousingsTriggers,
  ensureKnownHousingsTriggers,
  recomputeHousingsCounts
} from '~/scripts/import-lovac/infra/housings-counts-maintenance';

import { readPlan } from './read-plan';
import type { ApplySummary, PlanRow } from './types';

const CHUNK_SIZE = 1000;

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

  // Empty plan: short-circuit before opening a transaction or recomputing.
  const { size } = await stat(planFile);
  if (size === 0) {
    return { updated: 0, eventsDeleted: 0, eventsCreated: 0, skipped: 0 };
  }

  // Fail fast (before taking any lock) if a trigger we can't compensate for
  // appeared on the managed tables.
  if (bypassTriggers) {
    await ensureKnownHousingsTriggers();
  }

  const summary: ApplySummary = {
    updated: 0,
    eventsDeleted: 0,
    eventsCreated: 0,
    skipped: 0
  };

  // Rows carrying a state precondition (`expect`). Only these are held in
  // memory — a plan whose rows have no `expect` yields an empty list and streams
  // through apply exactly as before.
  const preconditions = await collectPreconditions(planFile);

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
    // disable — rolls back and the triggers are never left off.
    if (bypassTriggers) {
      await disableHousingsTriggers(transaction);
    }

    // Re-validate the state preconditions under a row lock before writing. The
    // plan is a point-in-time snapshot; a housing may have drifted between plan
    // and apply (a caseworker edit, the daily cron). Read the expected columns
    // `FOR UPDATE` so the lock is held for the rest of the transaction — nothing
    // can move these rows between this check and the writes below — and mark any
    // that no longer match as stale so their whole row is skipped.
    const staleKeys = new Set<string>();
    for (const chunk of chunksOf(preconditions, CHUNK_SIZE)) {
      const current = await Housing(transaction)
        .whereIn(
          ['geo_code', 'id'],
          chunk.map((row) => [row.housingGeoCode, row.housingId])
        )
        .forUpdate()
        .select(
          'geo_code',
          'id',
          'status',
          'sub_status',
          'occupancy',
          'occupancy_intended'
        );
      const currentByKey = new Map<string, HousingStateRow>(
        current.map((row) => [`${row.geo_code}:${row.id}`, row])
      );
      for (const row of chunk) {
        const key = `${row.housingGeoCode}:${row.housingId}`;
        const housing = currentByKey.get(key);
        if (!housing || !matchesExpect(housing, row.expect)) {
          staleKeys.add(key);
        }
      }
    }

    // Rows sharing an update payload arrive contiguously (plan.jsonl is ordered
    // by payload), so we buffer a run and flush one UPDATE per CHUNK_SIZE rows.
    // Correctness does not depend on the ordering; a misordered plan just
    // flushes more often. Deletes and inserts buffer independently. The
    // Writable's callback gates the parser, so memory stays bounded.
    let currentPayload: NonNullable<PlanRow['update']> | null = null;
    let currentKey: string | null = null;
    const updateBuffer: PlanRow[] = [];
    const deleteBuffer: string[] = [];
    const createBuffer: HousingEventApi[] = [];

    const flushUpdates = async () => {
      if (!currentPayload) {
        return;
      }
      const fields = toHousingColumns(currentPayload);
      if (Object.keys(fields).length === 0) {
        updateBuffer.length = 0;
        return;
      }
      while (updateBuffer.length > 0) {
        const chunk = updateBuffer.splice(0, CHUNK_SIZE);
        // Tuple WHERE on the (geo_code, id) primary key — PostgreSQL prunes it
        // to the touched partitions. `.update()` returns the rows it actually
        // matched, which may be fewer than planned (a housing deleted between
        // plan and apply), so count that.
        summary.updated += await Housing(transaction)
          .whereIn(
            ['geo_code', 'id'],
            chunk.map((row) => [row.housingGeoCode, row.housingId])
          )
          .update(fields);
      }
    };

    const flushDeletes = async () => {
      while (deleteBuffer.length > 0) {
        const chunk = deleteBuffer.splice(0, CHUNK_SIZE);
        await HousingEvents(transaction).whereIn('event_id', chunk).delete();
        // Count rows the DB actually removed, not the ids requested.
        summary.eventsDeleted += await Events(transaction)
          .whereIn('id', chunk)
          .delete();
      }
    };

    const flushCreates = async () => {
      while (createBuffer.length > 0) {
        const chunk = createBuffer.splice(0, CHUNK_SIZE);
        // onConflict(...).ignore() skips events that already exist, so RETURNING
        // yields only the rows actually inserted — count those, so a re-applied
        // plan reports 0 instead of overstating.
        const inserted = await Events(transaction)
          .insert(chunk.map(formatEventApi))
          .onConflict('id')
          .ignore()
          .returning('id');
        await HousingEvents(transaction)
          .insert(chunk.map(formatHousingEventApi))
          .onConflict('event_id')
          .ignore();
        summary.eventsCreated += inserted.length;
      }
    };

    const processRow = async (row: PlanRow) => {
      // The row's state precondition no longer holds: skip update, deletes and
      // creates together so a drifted housing is never partially rewritten.
      if (
        row.expect &&
        staleKeys.has(`${row.housingGeoCode}:${row.housingId}`)
      ) {
        summary.skipped++;
        return;
      }

      if (row.update && Object.keys(row.update).length > 0) {
        const key = JSON.stringify(row.update);
        if (key !== currentKey) {
          await flushUpdates();
          currentKey = key;
          currentPayload = row.update;
        }
        updateBuffer.push(row);
        if (updateBuffer.length >= CHUNK_SIZE) {
          await flushUpdates();
        }
      }

      if (row.deleteEventIds?.length) {
        deleteBuffer.push(...row.deleteEventIds);
        if (deleteBuffer.length >= CHUNK_SIZE) {
          await flushDeletes();
        }
      }

      if (row.createEvents?.length) {
        createBuffer.push(...row.createEvents);
        if (createBuffer.length >= CHUNK_SIZE) {
          await flushCreates();
        }
      }
    };

    await readPlan(
      planFile,
      new Writable({
        objectMode: true,
        write(row: PlanRow, _encoding, callback) {
          processRow(row).then(() => callback(), callback);
        }
      })
    );

    await flushUpdates();
    await flushDeletes();
    await flushCreates();

    // Recompute the derived counts once, then re-enable before commit so the
    // committed catalog state has the triggers back on.
    if (bypassTriggers) {
      await recomputeHousingsCounts(transaction);
      await enableHousingsTriggers(transaction);
    }
  });

  return summary;
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

interface Precondition {
  housingGeoCode: string;
  housingId: string;
  expect: NonNullable<PlanRow['expect']>;
}

/**
 * Stream the plan once and collect only the rows that carry a non-empty state
 * precondition. Keeps memory proportional to the preconditioned rows, not the
 * whole plan, so a repair that does not use `expect` pays nothing.
 */
async function collectPreconditions(planFile: string): Promise<Precondition[]> {
  const preconditions: Precondition[] = [];
  await readPlan(
    planFile,
    new Writable({
      objectMode: true,
      write(row: PlanRow, _encoding, callback) {
        if (row.expect && Object.keys(row.expect).length > 0) {
          preconditions.push({
            housingGeoCode: row.housingGeoCode,
            housingId: row.housingId,
            expect: row.expect
          });
        }
        callback();
      }
    })
  );
  return preconditions;
}

type HousingStateRow = Pick<
  HousingDBO,
  | 'geo_code'
  | 'id'
  | 'status'
  | 'sub_status'
  | 'occupancy'
  | 'occupancy_intended'
>;

/**
 * Whether the current housing still matches every column named in `expect`.
 * Only listed columns are compared, and `null` is a meaningful expected value
 * (e.g. "sub_status must still be null"), distinct from an omitted column.
 */
function matchesExpect(
  current: HousingStateRow,
  expect: NonNullable<PlanRow['expect']>
): boolean {
  if (expect.status !== undefined && current.status !== expect.status) {
    return false;
  }
  if (
    expect.subStatus !== undefined &&
    current.sub_status !== expect.subStatus
  ) {
    return false;
  }
  if (
    expect.occupancy !== undefined &&
    current.occupancy !== expect.occupancy
  ) {
    return false;
  }
  if (
    expect.occupancyIntended !== undefined &&
    current.occupancy_intended !== expect.occupancyIntended
  ) {
    return false;
  }
  return true;
}
