import type { ProspectDTO, SignupLinkDTO } from '@zerologementvacant/models';
import { zlvApi } from './api.service';

export const prospectAPI = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    saveProspect: builder.mutation<ProspectDTO, Pick<SignupLinkDTO, 'id'>>({
      query: (payload) => ({
        url: `signup-links/${payload.id}/prospect`,
        method: 'PUT'
      }),
      invalidatesTags: ['Prospect']
    }),

    getProspect: builder.query<ProspectDTO, ProspectDTO['email']>({
      query: (email) => `prospects/${email}`,
      providesTags: (prospect) =>
        prospect ? [{ type: 'Prospect', id: prospect.email }] : []
    })
  })
});

export const { useSaveProspectMutation, useGetProspectQuery } = prospectAPI;
