import { AxiosInstance } from 'axios';

import {
  HousingDTO,
  HousingFiltersDTO,
  Pagination
} from '@zerologementvacant/models';

export interface HousingAPI {
  find(opts?: FindOptions): Promise<HousingDTO[]>;
}

export function createHousingAPI(http: AxiosInstance): HousingAPI {
  return {
    async find(opts?: FindOptions): Promise<HousingDTO[]> {
      const response = await http.get(`/housing`, {
        params: {
          ...opts?.filters,
          paginate: opts?.paginate,
          page: opts?.page,
          perPage: opts?.perPage
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data.entities;
    }
  };
}

interface FindOptions extends Partial<Pagination> {
  filters?: HousingFiltersDTO;
}
