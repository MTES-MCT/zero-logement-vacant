import { AxiosInstance, AxiosResponse } from 'axios';

import {
  CampaignDTO,
  CampaignUpdatePayloadDTO,
} from '@zerologementvacant/models';

export interface CampaignAPI {
  get(id: CampaignDTO['id']): Promise<CampaignDTO | null>;
  update(
    id: CampaignDTO['id'],
    campaign: CampaignUpdatePayloadDTO,
  ): Promise<CampaignDTO>;
  exportCampaign(id: string): Promise<ArrayBuffer>;
}

export function createCampaignAPI(http: AxiosInstance): CampaignAPI {
  return {
    async get(id: string): Promise<CampaignDTO> {
      const response = await http.get<CampaignDTO>(`/campaigns/${id}`);
      return response.data;
    },
    async update(
      id: string,
      campaign: CampaignUpdatePayloadDTO,
    ): Promise<CampaignDTO> {
      const response = await http.put<CampaignDTO>(
        `/campaigns/${id}`,
        campaign,
      );
      return response.data;
    },
    async exportCampaign(id: string): Promise<ArrayBuffer> {
      const response: AxiosResponse<ArrayBuffer> = await http.get<ArrayBuffer>(`/campaigns/${id}/export`, { responseType: 'arraybuffer' });
      return response.data;
    },
  };
}
