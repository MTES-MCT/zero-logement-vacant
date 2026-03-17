import type { CampaignDTO } from '@zerologementvacant/models';

import { zlvApi } from './api.service';

interface ExportCampaignPayload {
  id: CampaignDTO['id'];
}

export const exportApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    exportCampaign: builder.mutation<string, ExportCampaignPayload>({
      query: ({ id }) => ({
        method: 'POST',
        url: `/campaigns/${id}/exports`,
        cache: 'no-cache',
        responseHandler: async (response) => {
          return URL.createObjectURL(await response.blob());
        }
      })
    })
  })
});

export const { useExportCampaignMutation } = exportApi;
