import type {
  CampaignCreationPayload,
  CampaignDTO,
  CampaignRemovalPayload,
  CampaignUpdatePayload
} from '@zerologementvacant/models';
import {
  fromCampaignDTO,
  type Campaign,
  type CampaignSort
} from '~/models/Campaign';
import type { CampaignFilters } from '~/models/CampaignFilters';
import type { Group } from '~/models/Group';
import { toQuery, type SortOptions } from '~/models/Sort';

import { zlvApi } from './api.service';
import { housingApi } from './housing.service';

export interface FindOptions extends SortOptions<CampaignSort> {
  filters?: CampaignFilters;
}

export const campaignApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findCampaigns: builder.query<Campaign[], FindOptions | void>({
      query: (opts) => ({
        url: 'campaigns',
        params: {
          groups: opts?.filters?.groupIds,
          sort: toQuery(opts?.sort)
        }
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'Campaign' as const,
                id
              })),
              { type: 'Campaign', id: 'LIST' }
            ]
          : [{ type: 'Campaign', id: 'LIST' }],
      transformResponse: (campaigns: ReadonlyArray<CampaignDTO>) =>
        campaigns.map(fromCampaignDTO)
    }),

    getCampaign: builder.query<Campaign, string>({
      query: (campaignId) => `campaigns/${campaignId}`,
      providesTags: (_result, _error, id) => [{ type: 'Campaign', id }],
      transformResponse: (campaign: CampaignDTO) => fromCampaignDTO(campaign)
    }),

    createCampaignFromGroup: builder.mutation<
      Campaign,
      {
        campaign: CampaignCreationPayload;
        group: Group;
      }
    >({
      query: (payload) => {
        const body: CampaignCreationPayload = {
          ...payload.campaign,
          sentAt: payload.campaign.sentAt?.slice(0, 'yyyy-mm-dd'.length) ?? null
        };

        return {
          url: `groups/${payload.group.id}/campaigns`,
          method: 'POST',
          body
        };
      },
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
      transformResponse: (campaign: CampaignDTO) => fromCampaignDTO(campaign)
    }),

    updateCampaign: builder.mutation<
      void,
      Pick<Campaign, 'id'> & CampaignUpdatePayload
    >({
      query: (payload) => ({
        url: `campaigns/${payload.id}`,
        method: 'PUT',
        body: payload
      }),
      invalidatesTags: (_result, _error, args) => [
        { type: 'Campaign', id: args.id }
      ]
    }),

    removeCampaignHousings: builder.mutation<
      void,
      Pick<CampaignDTO, 'id'> & { filters: CampaignRemovalPayload }
    >({
      query: ({ id, filters }) => ({
        url: `campaigns/${id}/housings`,
        method: 'DELETE',
        body: filters
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Campaign', id }],
      onQueryStarted: async (_args, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(
          housingApi.util.invalidateTags([
            'Housing',
            'HousingByStatus',
            'HousingCountByStatus'
          ])
        );
      }
    }),
    removeCampaign: builder.mutation<void, string>({
      query: (campaignId) => ({
        url: `campaigns/${campaignId}`,
        method: 'DELETE'
      }),
      invalidatesTags: () => [{ type: 'Campaign', id: 'LIST' }]
    })
  })
});

export const {
  useFindCampaignsQuery,
  useGetCampaignQuery,
  useLazyGetCampaignQuery,
  useUpdateCampaignMutation,
  useRemoveCampaignHousingsMutation,
  useRemoveCampaignMutation,
  useCreateCampaignFromGroupMutation
} = campaignApi;
