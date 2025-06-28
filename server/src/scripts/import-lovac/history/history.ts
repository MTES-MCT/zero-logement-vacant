import { DataFileYear } from '@zerologementvacant/models';

export interface History {
  geo_code: string;
  local_id: string;
  file_years: DataFileYear[];
}
