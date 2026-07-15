import type { Readable } from 'node:stream';

import type { HousingEventApi } from '~/models/EventApi';
import type { HousingApi } from '~/models/HousingApi';

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
   * A Node object-mode stream of the candidate housings — e.g. a Knex
   * `.stream()` — so `plan` never holds the whole set in memory. Each emitted
   * value must be an `H`; enrich via a JOIN (or a Transform piped inside
   * `query()`) so that {@link decide} can stay pure.
   */
  query(): Readable;
  decide(housing: H): RepairAction | RepairSkip | RepairError;
}

export interface RepairAction {
  update?: Partial<
    Pick<HousingApi, 'status' | 'subStatus' | 'occupancy' | 'occupancyIntended'>
  >;
  createEvents?: HousingEventApi[];
  deleteEventIds?: string[];
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
}
