import {
  CampaignCreationPayloadDTO,
  CampaignUpdatePayloadDTO
} from '@zerologementvacant/models';
import { parseISO } from 'date-fns';
import { Campaign, CampaignSort } from '../models/Campaign';
import { CampaignFilters } from '../models/CampaignFilters';
import { Group } from '../models/Group';
import { HousingFilters } from '../models/HousingFilters';
import { SortOptions, toQuery } from '../models/Sort';

import config from '../utils/config';
import { zlvApi } from './api.service';
import authService from './auth.service';
import { housingApi } from './housing.service';

export interface FindOptions extends SortOptions<CampaignSort> {
  filters?: CampaignFilters;
}

const parseCampaign = (c: any): Campaign =>
  (({
    ...c,
    createdAt: c.createdAt ? parseISO(c.createdAt) : undefined,
    validatedAt: c.validatedAt ? parseISO(c.validatedAt) : undefined,
    sentAt: c.sentAt ? parseISO(c.sentAt) : undefined,
    archivedAt: c.archivedAt ? parseISO(c.archivedAt) : undefined,
    exportURL: getExportURL(c.id)
  }) as Campaign);

export const campaignApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getCampaign: builder.query<Campaign, string>({
      query: (campaignId) => `campaigns/${campaignId}`,
      transformResponse: (c) => parseCampaign(c),
      providesTags: (_result, _error, id) => [{ type: 'Campaign', id }]
    }),
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
      transformResponse: (response: any[]) => response.map(parseCampaign)
    }),
    createCampaign: builder.mutation<Campaign, CampaignCreationPayloadDTO>({
      query: (payload) => ({
        url: 'campaigns',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
      transformResponse: parseCampaign
    }),
    createCampaignFromGroup: builder.mutation<
      Campaign,
      {
        campaign: Pick<Campaign, 'title' | 'description'>;
        group: Group;
      }
    >({
      query: (payload) => ({
        url: `campaigns/${payload.group.id}/groups`,
        method: 'POST',
        body: {
          title: payload.campaign.title,
          description: payload.campaign.description
        }
      }),
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
      transformResponse: parseCampaign
    }),
    updateCampaign: builder.mutation<void, Campaign>({
      query: (payload) => ({
        url: `campaigns/${payload.id}`,
        method: 'PUT',
        body: toCampaignPayloadDTO(payload)
      }),
      invalidatesTags: (_result, _error, args) => [
        { type: 'Campaign', id: args.id }
      ]
    }),
    removeCampaignHousing: builder.mutation<
      void,
      {
        campaignId: string;
        all: boolean;
        ids: string[];
        filters: HousingFilters;
      }
    >({
      query: ({ campaignId, ...payload }) => ({
        url: `campaigns/${campaignId}/housing`,
        method: 'DELETE',
        body: payload
      }),
      invalidatesTags: (_result, _error, { campaignId }) => [
        { type: 'Campaign', id: campaignId }
      ],
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

function toCampaignPayloadDTO(campaign: Campaign): CampaignUpdatePayloadDTO {
  return {
    title: campaign.title,
    description: campaign.description,
    status: campaign.status,
    sentAt: campaign.sentAt
  };
}

const getExportURL = (campaignId: string) => {
  return `${
    config.apiEndpoint
  }/api/campaigns/${campaignId}/export?x-access-token=${
    authService.authHeader()?.['x-access-token']
  }`;
};

export const {
  useFindCampaignsQuery,
  useGetCampaignQuery,
  useLazyGetCampaignQuery,
  useUpdateCampaignMutation,
  useRemoveCampaignHousingMutation,
  useRemoveCampaignMutation,
  useCreateCampaignMutation,
  useCreateCampaignFromGroupMutation
} = campaignApi;
