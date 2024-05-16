import { AxiosInstance } from 'axios';

import {
  HousingDTO,
  HousingFiltersDTO,
  PaginationOptions,
} from '@zerologementvacant/models';

export interface HousingAPI {
  find(opts?: FindOptions): Promise<HousingDTO[]>;
}

export function createHousingAPI(http: AxiosInstance): HousingAPI {
  return {
    async find(opts?: FindOptions): Promise<HousingDTO[]> {
      const response = await http.post('/housing', opts, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data.entities;
    },
  };
}

interface FindOptions extends PaginationOptions {
  filters?: HousingFiltersDTO;
}
