import { HousingDTO } from '@zerologementvacant/models';
import { HousingApi } from './HousingApi';

export interface PaginatedResultApi<T> {
  totalCount: number;
  filteredCount: number;
  entities: Array<T>;
  page: number;
  perPage: number;
}

export type HousingPaginatedResultApi = PaginatedResultApi<HousingApi> & {
  filteredOwnerCount: number;
};

export type HousingPaginatedDTO = PaginatedResultApi<HousingDTO> & {
  filteredOwnerCount: number;
};
