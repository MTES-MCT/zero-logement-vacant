import { Settings } from '../../../shared';
import { DeepPartial } from 'ts-essentials';
import { zlvApi } from './api.service';

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

export const settingsApi = zlvApi.injectEndpoints({
  endpoints: (builder) => ({
    findSettings: builder.query<Settings, FindOneOptions>({
      query: (options) => `establishments/${options.establishmentId}/settings`,
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
        url: `establishments/${establishmentId}/settings`,
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const { useFindSettingsQuery, useUpsertSettingsMutation } = settingsApi;
