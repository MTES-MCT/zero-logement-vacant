import config from '../utils/config';
import authService from './auth.service';
import { parseISO } from 'date-fns';
import {
  Campaign,
  CampaignSort,
  CampaignUpdate,
  DraftCampaign,
} from '../models/Campaign';
import { HousingFilters } from '../models/HousingFilters';
import { Group } from '../models/Group';
import { getURLQuery } from '../utils/fetchUtils';
import { CampaignFilters } from '../models/CampaignFilters';
import { housingApi } from './housing.service';
import { SortOptions, toQuery } from '../models/Sort';
import { zlvApi } from './api.service';

export interface FindOptions extends SortOptions<CampaignSort> {
  filters?: CampaignFilters;
}

const parseCampaign = (c: any): Campaign =>
  ({
    ...c,
    createdAt: c.createdAt ? parseISO(c.createdAt) : undefined,
    validatedAt: c.validatedAt ? parseISO(c.validatedAt) : undefined,
    sentAt: c.sentAt ? parseISO(c.sentAt) : undefined,
    archivedAt: c.archivedAt ? parseISO(c.archivedAt) : undefined,
    sendingDate: c.sendingDate ? parseISO(c.sendingDate) : undefined,
    exportURL: getExportURL(c.id),
  } as Campaign);

export const campaignApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    getCampaign: builder.query<Campaign, string>({
      query: (campaignId) => `campaigns/${campaignId}`,
      transformResponse: (c) => parseCampaign(c),
      providesTags: (result, error, id) => [{ type: 'Campaign', id }],
    }),
    findCampaigns: builder.query<Campaign[], FindOptions | void>({
      query: (opts) => ({
        url: `campaigns/${getURLQuery({
          groups: opts?.filters?.groupIds,
          sort: toQuery(opts?.sort),
        })}`,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'Campaign' as const,
                id,
              })),
              { type: 'Campaign', id: 'LIST' },
            ]
          : [{ type: 'Campaign', id: 'LIST' }],
      transformResponse: (response: any[]) => response.map(parseCampaign),
    }),
    createCampaign: builder.mutation<
      Campaign,
      {
        draftCampaign: DraftCampaign;
        allHousing: boolean;
        housingIds?: string[];
      }
    >({
      query: (payload) => ({
        url: 'campaigns',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
      transformResponse: parseCampaign,
    }),
    createCampaignFromGroup: builder.mutation<
      Campaign,
      {
        campaign: Pick<Campaign, 'title'>;
        group: Group;
      }
    >({
      query: (payload) => ({
        url: `campaigns/groups/${payload.group.id}`,
        method: 'POST',
        body: {
          title: payload.campaign.title,
        },
      }),
      invalidatesTags: [{ type: 'Campaign', id: 'LIST' }],
      transformResponse: parseCampaign,
    }),
    updateCampaign: builder.mutation<
      void,
      {
        id: string;
        campaignUpdate: CampaignUpdate;
      }
    >({
      query: ({ id, campaignUpdate }) => ({
        url: `campaigns/${id}`,
        method: 'PUT',
        body: { ...campaignUpdate },
      }),
      invalidatesTags: (result, error, args) => [
        { type: 'Campaign', id: args.id },
      ],
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
        body: payload,
      }),
      invalidatesTags: (result, error, { campaignId }) => [
        { type: 'Campaign', id: campaignId },
      ],
      onQueryStarted: async (args, { dispatch, queryFulfilled }) => {
        await queryFulfilled;
        dispatch(
          housingApi.util.invalidateTags([
            'Housing',
            'HousingByStatus',
            'HousingCountByStatus',
          ])
        );
      },
    }),
    removeCampaign: builder.mutation<void, string>({
      query: (campaignId) => ({
        url: `campaigns/${campaignId}`,
        method: 'DELETE',
      }),
      invalidatesTags: () => [{ type: 'Campaign', id: 'LIST' }],
    }),
  }),
});

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
  useUpdateCampaignMutation,
  useRemoveCampaignHousingMutation,
  useRemoveCampaignMutation,
  useCreateCampaignMutation,
  useCreateCampaignFromGroupMutation,
} = campaignApi;
