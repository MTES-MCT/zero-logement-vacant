import type { CampaignDTO } from '@zerologementvacant/models';

import { zlvApi } from './api.service';

interface ExportCampaignPayload {
  id: CampaignDTO['id'];
  type: 'drafts' | 'recipients';
}

export const exportApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    exportCampaign: builder.mutation<string, ExportCampaignPayload>({
      query: ({ id, type }) => ({
        method: 'POST',
        url: `/campaigns/${id}/exports`,
        body: {
          type
        },
        cache: 'no-cache',
        responseHandler: async (response) => {
          return URL.createObjectURL(await response.blob());
        }
      })
    })
  })
});

export const { useExportCampaignMutation } = exportApi;
