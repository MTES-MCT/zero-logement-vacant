import { Settings } from '../../../shared/models/Settings';
import config from '../utils/config';
import authService from './auth.service';
import { DeepPartial } from 'ts-essentials';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';

interface FindOneOptions {
  establishmentId: string;
}

const DEFAULT_SETTINGS: Settings = {
  contactPoints: {
    public: false,
  },
  inbox: {
    enabled: true,
  },
};

export const settingsApi = createApi({
  reducerPath: 'settingsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${config.apiEndpoint}/api/establishments`,
    prepareHeaders: (headers: Headers) => authService.withAuthHeader(headers),
  }),
  tagTypes: ['Settings'],
  endpoints: (builder) => ({
    findSettings: builder.query<Settings, FindOneOptions>({
      query: (options) => `/${options.establishmentId}/settings`,
      providesTags: () => ['Settings'],
      transformErrorResponse: (response) => {
        if (response.status === 404) {
          return DEFAULT_SETTINGS;
        }
      },
    }),
    upsertSettings: builder.mutation<
      void,
      {
        establishmentId: string;
        settings: DeepPartial<Settings>;
      }
    >({
      query: ({ establishmentId, settings }) => ({
        url: `/${establishmentId}/settings`,
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const { useFindSettingsQuery, useUpsertSettingsMutation } = settingsApi;
