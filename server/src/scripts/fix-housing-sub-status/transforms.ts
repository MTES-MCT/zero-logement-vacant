import { HousingStatus } from '@zerologementvacant/models';

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
