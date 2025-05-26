import { DraftDTO, DraftFiltersDTO } from '@zerologementvacant/models';
import { AxiosInstance } from 'axios';

export interface DraftAPI {
  find(opts?: FindOptions): Promise<DraftDTO[]>;
}

export function createDraftAPI(http: AxiosInstance): DraftAPI {
  return {
    async find(opts?: FindOptions): Promise<DraftDTO[]> {
      const query = {
        ...opts?.filters
      };
      const response = await http.get(`/drafts${query}`);
      return response.data;
    }
  };
}

interface FindOptions {
  filters?: DraftFiltersDTO;
}
