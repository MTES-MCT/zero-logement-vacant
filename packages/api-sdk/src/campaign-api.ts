import { AxiosInstance } from 'axios';

import { CampaignDTO } from '@zerologementvacant/models';

export interface CampaignAPI {
  get(id: CampaignDTO['id']): Promise<CampaignDTO | null>;
}

export function createCampaignAPI(http: AxiosInstance): CampaignAPI {
  return {
    async get(id: string): Promise<CampaignDTO> {
      const response = await http.get<CampaignDTO>(`/campaigns/${id}`);
      return response.data;
    },
  };
}
