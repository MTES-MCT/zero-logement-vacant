import type { Transaction } from 'kysely';

import type { DB } from '~/infra/database/db';
import type { HousingEventApi } from '~/models/EventApi';
import type { HousingApi } from '~/models/HousingApi';

import type { RowStream } from './row-stream';

export interface Repair<H extends HousingApi = HousingApi> {
  name: string;
  /**
   * Disable the `fast_housing` / `housing_events` count triggers during
   * `apply` and recompute the counts once at the end, instead of firing them
   * per row. Set to `true` for large repairs that touch `status` or
   * `occupancy` (the trigger-watched columns). Defaults to `false`; the
   * `--bypass-triggers` / `--no-bypass-triggers` CLI flag overrides it.
   */
  bypassTriggers?: boolean;
  /**
   * A stream of the candidate housings — build it with {@link rows} (e.g.
   * `rows<H>(db(...).stream())`) so its element type is tied to {@link decide}
   * at compile time. `plan` streams it, so the whole set never sits in memory.
   * Enrich via a JOIN (or a Transform piped inside `query()`) so `decide` stays
   * pure.
   */
  query(): RowStream<H>;
  decide(housing: H): RepairAction | RepairSkip | RepairError;
  /**
   * Extra apply-time staleness check for rows carrying an `expect` precondition,
   * for repairs whose real precondition cannot be expressed as a housing-column
   * `expect` (e.g. "no sibling campaign has since reached its sending date").
   * Runs inside apply()'s own transaction — take any row lock needed (e.g.
   * `.forUpdate()`) via `trx` so it is held until that transaction commits.
   * See {@link ApplyOptions.revalidate} in `lib/apply.ts`.
   */
  revalidate?(rows: PlanRow[], trx: Transaction<DB>): Promise<Set<string>>;
}

export interface RepairAction {
  update?: Partial<
    Pick<HousingApi, 'status' | 'subStatus' | 'occupancy' | 'occupancyIntended'>
  >;
  createEvents?: HousingEventApi[];
  deleteEventIds?: string[];
  /**
   * State the housing must still be in at `apply` time for this row to run. The
   * plan is a point-in-time snapshot; between `plan` and `apply` a housing may
   * have moved (a caseworker edit, a concurrent cron). `apply` re-reads the
   * listed columns under a row lock and, if any drifted, skips the *whole* row
   * (update, deletes and creates) rather than blindly overwriting — counting it
   * as `skipped`. Only the listed columns are checked; omit for repairs that do
   * not need it (they keep streaming without the per-row pre-read).
   */
  expect?: Partial<
    Pick<HousingApi, 'status' | 'subStatus' | 'occupancy' | 'occupancyIntended'>
  >;
}

export interface RepairSkip {
  action: 'skip';
}

export interface RepairError {
  action: 'error';
  reason: string;
}

export interface PlanRow {
  housingId: string;
  housingGeoCode: string;
  update?: RepairAction['update'];
  createEvents?: HousingEventApi[];
  deleteEventIds?: string[];
  expect?: RepairAction['expect'];
}

export interface SkippedRow {
  housingId: string;
  housingGeoCode: string;
}

export interface ErrorRow {
  housingId: string;
  housingGeoCode: string;
  reason: string;
}

export interface PlanSummary {
  total: number;
  planned: number;
  skipped: number;
  errors: number;
  eventsToDelete: number;
  eventsToCreate: number;
}

export interface ApplySummary {
  updated: number;
  eventsDeleted: number;
  eventsCreated: number;
  /**
   * Rows dropped because their `expect` precondition no longer held at apply
   * time (the housing drifted between `plan` and `apply`). Always 0 for plans
   * whose rows carry no `expect`.
   */
  skipped: number;
}
