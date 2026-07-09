import { HousingStatus } from '@zerologementvacant/models';

import type { HousingId } from '~/models/HousingApi';

import type { DecideInput, EventNextNew } from './decide';
import { normalizeEventPair } from './legacy';

export interface RawRow {
  geo_code: string;
  id: string;
  status: number;
  sub_status: string | null;
  data_file_years: string[] | null;
  next_new: EventNextNew | null;
  event_created_at: Date | string | null;
}

/**
 * Why a row was selected for repair — for inspection only; `decide()` computes
 * the target from the status/event, not from this.
 */
export type SelectedBy = 'null-sub' | 'wrong-sub' | 'forbidden-sub';

export function selectedBy(
  status: number,
  subStatus: string | null
): SelectedBy {
  if (subStatus === null) {
    return 'null-sub';
  }
  // status 0 (NEVER_CONTACTED) / 1 (WAITING) must not carry a sub-status
  return status === 0 || status === 1 ? 'forbidden-sub' : 'wrong-sub';
}

export function toDecideInput(row: RawRow): DecideInput {
  const hasEvent = row.event_created_at !== null;
  return {
    geoCode: row.geo_code,
    id: row.id,
    status: row.status as HousingStatus,
    subStatus: row.sub_status,
    dataFileYears: row.data_file_years ?? [],
    latestEvent: hasEvent ? (row.next_new ?? {}) : null
  };
}

export interface PlanRow {
  geo_code: string;
  id: string;
  current_status: number;
  current_sub_status: string | null;
  target_status: number;
  target_sub_status: string | null;
  latest_event: EventNextNew | null;
}

/**
 * An admin `housing:status-updated` event is written on `apply` whenever the
 * target differs from what the latest event already recorded (a genuine
 * override). Pure restores — where we merely sync the row to its latest event —
 * need none.
 */
export function needsEvent(row: PlanRow): boolean {
  if (!row.latest_event) {
    return true;
  }
  const event = normalizeEventPair(
    row.latest_event.status,
    row.latest_event.subStatus
  );
  return (
    !event.ok ||
    event.status !== row.target_status ||
    event.subStatus !== row.target_sub_status
  );
}

export interface UpdateGroup {
  status: HousingStatus;
  subStatus: string | null;
  housings: HousingId[];
}

export function groupByTarget(
  rows: ReadonlyArray<
    Pick<PlanRow, 'geo_code' | 'id' | 'target_status' | 'target_sub_status'>
  >
): UpdateGroup[] {
  const groups = new Map<string, UpdateGroup>();
  for (const row of rows) {
    const key = `${row.target_status}|${row.target_sub_status ?? ''}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        status: row.target_status as HousingStatus,
        subStatus: row.target_sub_status,
        housings: []
      };
      groups.set(key, group);
    }
    group.housings.push({ geoCode: row.geo_code, id: row.id });
  }
  return [...groups.values()];
}
