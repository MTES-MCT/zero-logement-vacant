import { AxiosInstance } from 'axios';

import { OwnerDTO } from '@zerologementvacant/models';

export interface OwnerAPI {
  findByHousing(id: string): Promise<OwnerDTO[]>;
}

export function createOwnerAPI(http: AxiosInstance): OwnerAPI {
  return {
    async findByHousing(id: string): Promise<OwnerDTO[]> {
      const response = await http.get(`/owners/housing/${id}`);
      return response.data;
    },
  };
}
