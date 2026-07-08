import { HousingStatus } from '@zerologementvacant/models';

import type { HousingId } from '~/models/HousingApi';

import type { DecideInput, EventNextNew } from './decide';

export interface RawRow {
  geo_code: string;
  id: string;
  status: number;
  data_file_years: string[] | null;
  next_new: EventNextNew | null;
  event_created_at: Date | string | null;
}

export function toDecideInput(row: RawRow): DecideInput {
  const hasEvent = row.event_created_at !== null;
  return {
    geoCode: row.geo_code,
    id: row.id,
    status: row.status as HousingStatus,
    dataFileYears: row.data_file_years ?? [],
    latestEvent: hasEvent ? (row.next_new ?? {}) : null
  };
}

export interface PlanRow {
  geo_code: string;
  id: string;
  target_status: number;
  target_sub_status: string | null;
}

export interface UpdateGroup {
  status: HousingStatus;
  subStatus: string | null;
  housings: HousingId[];
}

export function groupByTarget(rows: ReadonlyArray<PlanRow>): UpdateGroup[] {
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
