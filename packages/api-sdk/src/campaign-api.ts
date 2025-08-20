import {
  CampaignDTO,
  CampaignUpdatePayloadDTO
} from '@zerologementvacant/models';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { Readable } from 'node:stream';
import { type ReadableStream } from 'node:stream/web';

export interface CampaignAPI {
  get(id: CampaignDTO['id']): Promise<CampaignDTO | null>;
  update(
    id: CampaignDTO['id'],
    campaign: CampaignUpdatePayloadDTO
  ): Promise<CampaignDTO>;
  exportCampaign(id: string): Promise<ReadableStream>;
}

export function createCampaignAPI(http: AxiosInstance): CampaignAPI {
  return {
    async get(id: string): Promise<CampaignDTO> {
      const response = await http.get<CampaignDTO>(`/campaigns/${id}`);
      return response.data;
    },
    async update(
      id: string,
      campaign: CampaignUpdatePayloadDTO
    ): Promise<CampaignDTO> {
      const response = await http.put<CampaignDTO>(
        `/campaigns/${id}`,
        campaign
      );
      return response.data;
    },
    async exportCampaign(id: string): Promise<ReadableStream> {
      const response: AxiosResponse<Readable> = await http.get<Readable>(
        `/campaigns/${id}/export`,
        { responseType: 'stream' }
      );
      return Readable.toWeb(response.data);
    }
  };
}
