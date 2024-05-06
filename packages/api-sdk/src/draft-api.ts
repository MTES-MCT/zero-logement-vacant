import { AxiosInstance } from 'axios';

import { DraftDTO, DraftFiltersDTO } from '@zerologementvacant/models';
import { createQuery } from '@zerologementvacant/utils';

export interface DraftAPI {
  find(opts?: FindOptions): Promise<DraftDTO[]>;
}

export function createDraftAPI(http: AxiosInstance): DraftAPI {
  return {
    async find(opts?: FindOptions): Promise<DraftDTO[]> {
      const query = createQuery({
        ...opts?.filters,
      });
      const response = await http.get('/drafts', {
        params: query,
      });
      return response.data;
    },
  };
}

interface FindOptions {
  filters?: DraftFiltersDTO;
}
